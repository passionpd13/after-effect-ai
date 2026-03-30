/*
 * AE Auto Pipeline - ExtendScript Template v1.0
 * =============================================
 * JSON 스키마를 읽어서 After Effects에서 자동으로 영상을 생성하는 스크립트
 * 
 * 사용법:
 * 1. After Effects 열기
 * 2. File > Scripts > Run Script File... 선택
 * 3. 이 .jsx 파일 선택
 * 4. JSON 파일 경로 입력
 * 
 * 또는 명령줄에서:
 * afterfx.exe -r "이_스크립트.jsx" -s "JSON경로"
 */

// ============================================================
// [0] 유틸리티 함수
// ============================================================

// 파일 헤더를 읽어서 실제 이미지 포맷 감지 (확장자와 내용 불일치 수정)
function detectAndFixImageFile(filePath) {
    var f = new File(filePath);
    if (!f.exists) return f;

    // 바이너리 모드로 처음 4바이트 읽기
    f.open("r");
    f.encoding = "BINARY";
    var header = f.read(4);
    f.close();

    // 실제 포맷 감지
    var actualExt = "";
    if (header.length >= 4) {
        var b0 = header.charCodeAt(0);
        var b1 = header.charCodeAt(1);
        var b2 = header.charCodeAt(2);
        var b3 = header.charCodeAt(3);

        if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47) {
            actualExt = ".png";  // PNG: 89 50 4E 47
        } else if (b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF) {
            actualExt = ".jpg";  // JPEG: FF D8 FF
        } else if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46) {
            actualExt = ".gif";  // GIF: 47 49 46
        } else if (b0 === 0x42 && b1 === 0x4D) {
            actualExt = ".bmp";  // BMP: 42 4D
        } else if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46) {
            actualExt = ".webp"; // WEBP: 52 49 46 46 (RIFF)
        } else if ((b0 === 0x49 && b1 === 0x49) || (b0 === 0x4D && b1 === 0x4D)) {
            actualExt = ".tiff"; // TIFF: 49 49 or 4D 4D
        }
    }

    if (!actualExt) return f; // 감지 실패시 원본 사용

    // 현재 확장자와 비교
    var currentName = f.name;
    var dotIdx = currentName.lastIndexOf(".");
    var currentExt = dotIdx >= 0 ? currentName.slice(dotIdx).toLowerCase() : "";

    // 확장자 일치하면 그대로 반환
    if (currentExt === actualExt) return f;
    if (currentExt === ".jpeg" && actualExt === ".jpg") return f;
    if (currentExt === ".jpg" && actualExt === ".jpg") return f;

    // 불일치! 올바른 확장자로 복사본 생성
    var newName = dotIdx >= 0 ? currentName.slice(0, dotIdx) + actualExt : currentName + actualExt;
    var newPath = new File(f.parent.fsName + "/" + newName);
    f.copy(newPath);
    return newPath;
}
// 색상값을 안전한 [R,G,B] 배열로 변환 (0~1 범위)
// [R,G,B,A] 4개 값이면 A는 무시하고 3개만 사용
// [255,0,0] 같은 0~255 범위는 자동 변환
// 숫자가 아닌 값이면 fallback 사용
function safeColor(val, fallback) {
    if (!fallback) fallback = [1, 1, 1];
    if (!val) return fallback;
    if (!(val instanceof Array)) return fallback;
    if (val.length < 3) return fallback;
    var r = Number(val[0]), g = Number(val[1]), b = Number(val[2]);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return fallback;
    // 0~255 범위인 경우 0~1로 변환
    if (r > 1 || g > 1 || b > 1) {
        r = r / 255; g = g / 255; b = b / 255;
    }
    return [
        Math.max(0, Math.min(1, r)),
        Math.max(0, Math.min(1, g)),
        Math.max(0, Math.min(1, b))
    ];
}

// 안전하게 setValue 호출 (배열이 아니면 무시)
function safeSetValue(prop, val) {
    try {
        if (val instanceof Array) {
            prop.setValue(val);
        } else if (typeof val === "number") {
            prop.setValue(val);
        }
    } catch(e) {
        // setValue 실패 무시
    }
}

// ============================================================
// [1] JSON 파일 로드
// ============================================================
function loadJSON(filePath) {
    var file = new File(filePath);
    if (!file.exists) {
        alert("JSON 파일을 찾을 수 없습니다: " + filePath);
        return null;
    }
    file.open("r");
    var content = file.read();
    file.close();
    
    // ExtendScript는 JSON.parse가 없으므로 eval 사용
    var data = eval("(" + content + ")");
    return data;
}

// ============================================================
// [2] 프로젝트 및 컴포지션 설정
// ============================================================
function createProject(data) {
    var settings = data.settings;
    var project = app.project;

    // total_duration이 없거나 0이면 씬 합계로 계산
    var totalDur = settings.total_duration;
    if (!totalDur || totalDur <= 0) {
        totalDur = 0;
        for (var i = 0; i < data.scenes.length; i++) {
            totalDur += data.scenes[i].duration || 4;
        }
    }
    if (totalDur <= 0) totalDur = 10; // 최소 10초 보장

    var compWidth = settings.width || 1080;
    var compHeight = settings.height || 1920;
    var compFps = settings.fps || 30;
    var compName = data.project.name || "main_comp";

    // 메인 컴포지션 생성
    var comp = project.items.addComp(
        compName,       // 이름
        compWidth,      // 너비
        compHeight,     // 높이
        1,              // 픽셀 비율
        totalDur,       // 총 길이 (초)
        compFps         // FPS
    );
    
    // 배경색 설정
    // v1: settings.background_color = [r,g,b]
    // v2: settings.background.type = "gradient" | "solid", settings.background.color, settings.background.gradient.colors
    var bg = [0.85, 0.85, 0.85]; // 기본값
    if (settings.background_color) {
        bg = safeColor(settings.background_color, bg);
    } else if (settings.background) {
        if (settings.background.color) {
            bg = safeColor(settings.background.color, bg);
        } else if (settings.background.gradient && settings.background.gradient.colors && settings.background.gradient.colors.length > 0) {
            // 그라데이션의 첫 번째 색상 사용 (AE solid는 단색만 가능)
            bg = safeColor(settings.background.gradient.colors[0], bg);
        }
    }
    var bgSolid = comp.layers.addSolid(
        bg,
        "Background",
        compWidth,
        compHeight,
        1,
        totalDur
    );
    bgSolid.locked = true;
    
    return comp;
}

// ============================================================
// [3] 이미지 임포트 및 배치
// ============================================================
function importAndPlaceImage(comp, scene, startTime, projectFolder) {
    if (!scene.image || !scene.image.file) return null;
    
    var imagePath = new File(projectFolder + "/" + scene.image.file);
    if (!imagePath.exists) {
        alert("이미지를 찾을 수 없습니다: " + scene.image.file);
        return null;
    }
    
    // 이미지 임포트 (확장자/내용 불일치 자동 수정)
    imagePath = detectAndFixImageFile(imagePath);
    var importOptions = new ImportOptions(imagePath);
    var footage = app.project.importFile(importOptions);
    
    // 컴프에 추가
    var layer = comp.layers.add(footage);
    layer.startTime = startTime;
    layer.outPoint = startTime + scene.duration;
    layer.name = "Scene_" + scene.id + "_image";
    
    // fit_mode 적용
    applyFitMode(layer, comp, scene.image.fit_mode || "contain");
    
    // 위치 설정
    applyPosition(layer, comp, scene.image.position);
    
    // 그림자 적용
    if (scene.image.shadow && scene.image.shadow.enabled) {
        applyDropShadow(layer, scene.image.shadow);
    }
    
    return layer;
}

function applyFitMode(layer, comp, fitMode) {
    var compW = comp.width;
    var compH = comp.height;
    var layerW = layer.source.width;
    var layerH = layer.source.height;
    
    var scaleX, scaleY, finalScale;
    
    switch (fitMode) {
        case "cover":
            scaleX = (compW / layerW) * 100;
            scaleY = (compH / layerH) * 100;
            finalScale = Math.max(scaleX, scaleY);
            break;
        case "contain":
            scaleX = (compW / layerW) * 100;
            scaleY = (compH / layerH) * 100;
            finalScale = Math.min(scaleX, scaleY);
            break;
        case "stretch":
            layer.transform.scale.setValue([
                (compW / layerW) * 100,
                (compH / layerH) * 100
            ]);
            return;
        case "original":
        default:
            finalScale = 100;
            break;
    }
    
    layer.transform.scale.setValue([finalScale, finalScale]);
}

function applyPosition(layer, comp, position) {
    if (!position) return;
    
    var x = comp.width / 2;
    var y = comp.height / 2;
    
    switch (position.x) {
        case "left":   x = comp.width * 0.3;  break;
        case "right":  x = comp.width * 0.7;  break;
        case "center": x = comp.width / 2;    break;
    }
    
    switch (position.y) {
        case "top":    y = comp.height * 0.3;  break;
        case "bottom": y = comp.height * 0.7;  break;
        case "center": y = comp.height / 2;    break;
    }
    
    layer.transform.position.setValue([x, y]);
}

// ============================================================
// [4] 텍스트 레이어 생성
// ============================================================
function createTextLayer(comp, scene, startTime) {
    if (!scene.text || !scene.text.content) return null;
    
    var textLayer = comp.layers.addText(scene.text.content);
    textLayer.startTime = startTime + (scene.text.delay || 0);
    textLayer.outPoint = startTime + scene.duration;
    textLayer.name = "Scene_" + scene.id + "_text";
    
    // 텍스트 스타일 설정
    var textProp = textLayer.property("Source Text");
    var textDoc = textProp.value;
    textDoc.fontSize = scene.text.size_override || 50;
    textDoc.fillColor = [0.2, 0.2, 0.2]; // 기본 어두운 텍스트
    textDoc.font = "NotoSansKR-Bold";
    textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
    textProp.setValue(textDoc);
    
    // 텍스트 위치
    var pos = getTextPosition(comp, scene.text.position);
    textLayer.transform.position.setValue(pos);
    
    // 텍스트 애니메이션
    applyTextAnimation(textLayer, scene.text.animation, startTime + (scene.text.delay || 0));
    
    return textLayer;
}

function getTextPosition(comp, position) {
    var x = comp.width / 2;
    var y = comp.height / 2;
    var margin = 150;
    
    switch (position) {
        case "top":          y = margin; break;
        case "bottom":       y = comp.height - margin; break;
        case "center":       break;
        case "top_left":     x = comp.width * 0.3; y = margin; break;
        case "top_right":    x = comp.width * 0.7; y = margin; break;
        case "bottom_left":  x = comp.width * 0.3; y = comp.height - margin; break;
        case "bottom_right": x = comp.width * 0.7; y = comp.height - margin; break;
    }
    
    return [x, y];
}

function applyTextAnimation(layer, animType, startTime) {
    var dur = 0.8; // 애니메이션 길이

    switch (animType) {
        case "fade_in":
            layer.transform.opacity.setValueAtTime(startTime, 0);
            layer.transform.opacity.setValueAtTime(startTime + dur, 100);
            break;
            
        case "slide_up":
            var pos = layer.transform.position.value;
            layer.transform.position.setValueAtTime(startTime, [pos[0], pos[1] + 100]);
            layer.transform.position.setValueAtTime(startTime + dur, pos);
            layer.transform.opacity.setValueAtTime(startTime, 0);
            layer.transform.opacity.setValueAtTime(startTime + dur, 100);
            break;
            
        case "slide_down":
            var pos = layer.transform.position.value;
            layer.transform.position.setValueAtTime(startTime, [pos[0], pos[1] - 100]);
            layer.transform.position.setValueAtTime(startTime + dur, pos);
            layer.transform.opacity.setValueAtTime(startTime, 0);
            layer.transform.opacity.setValueAtTime(startTime + dur, 100);
            break;
            
        case "bounce":
            var pos = layer.transform.position.value;
            layer.transform.position.setValueAtTime(startTime, [pos[0], pos[1] - 80]);
            layer.transform.position.setValueAtTime(startTime + dur * 0.5, pos);
            layer.transform.position.setValueAtTime(startTime + dur * 0.7, [pos[0], pos[1] - 20]);
            layer.transform.position.setValueAtTime(startTime + dur, pos);
            break;
            
        case "type_writer":
            // 타자기 효과 - 텍스트 애니메이터 사용
            var animator = layer.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
            var selector = animator.property("ADBE Text Selectors").property(1);
            selector.property("ADBE Text Percent Start").setValueAtTime(startTime, 0);
            selector.property("ADBE Text Percent Start").setValueAtTime(startTime + dur * 2, 100);
            var props = animator.property("ADBE Text Animator Properties");
            props.addProperty("ADBE Text Opacity");
            props.property("ADBE Text Opacity").setValue(0);
            break;

        case "blur_in":
            layer.transform.opacity.setValueAtTime(startTime, 0);
            layer.transform.opacity.setValueAtTime(startTime + dur, 100);
            var blur = layer.Effects.addProperty("ADBE Gaussian Blur 2");
            blur.property("ADBE Gaussian Blur 2-0001").setValueAtTime(startTime, 30);
            blur.property("ADBE Gaussian Blur 2-0001").setValueAtTime(startTime + dur, 0);
            break;
            
        case "none":
        default:
            break;
    }
}

// ============================================================
// [5] 장면 애니메이션
// ============================================================
function applySceneAnimation(layer, animation, startTime, duration) {
    if (!animation || animation.type === "none") return;
    
    // intensity에 따른 변화량
    var intensityMap = {
        "subtle": 0.10,
        "normal": 0.20,
        "strong": 0.40
    };
    var factor = intensityMap[animation.intensity] || 0.20;
    
    var currentScale = layer.transform.scale.value;
    var currentPos = layer.transform.position.value;
    var baseScale = currentScale[0];
    
    switch (animation.type) {
        case "zoom_in":
            layer.transform.scale.setValueAtTime(startTime, currentScale);
            layer.transform.scale.setValueAtTime(startTime + duration, [
                baseScale * (1 + factor), 
                baseScale * (1 + factor)
            ]);
            break;
            
        case "zoom_out":
            layer.transform.scale.setValueAtTime(startTime, [
                baseScale * (1 + factor), 
                baseScale * (1 + factor)
            ]);
            layer.transform.scale.setValueAtTime(startTime + duration, currentScale);
            break;
            
        case "pan_left":
            layer.transform.position.setValueAtTime(startTime, currentPos);
            layer.transform.position.setValueAtTime(startTime + duration, [
                currentPos[0] - (layer.source.width * factor * 0.5), 
                currentPos[1]
            ]);
            break;
            
        case "pan_right":
            layer.transform.position.setValueAtTime(startTime, currentPos);
            layer.transform.position.setValueAtTime(startTime + duration, [
                currentPos[0] + (layer.source.width * factor * 0.5), 
                currentPos[1]
            ]);
            break;
            
        case "pan_up":
            layer.transform.position.setValueAtTime(startTime, currentPos);
            layer.transform.position.setValueAtTime(startTime + duration, [
                currentPos[0], 
                currentPos[1] - (layer.source.height * factor * 0.5)
            ]);
            break;
            
        case "pan_down":
            layer.transform.position.setValueAtTime(startTime, currentPos);
            layer.transform.position.setValueAtTime(startTime + duration, [
                currentPos[0], 
                currentPos[1] + (layer.source.height * factor * 0.5)
            ]);
            break;
            
        case "ken_burns":
            // 줌인 + 패닝 조합
            var targetScale = baseScale * (1 + factor);
            layer.transform.scale.setValueAtTime(startTime, currentScale);
            layer.transform.scale.setValueAtTime(startTime + duration, [targetScale, targetScale]);
            layer.transform.position.setValueAtTime(startTime, currentPos);
            layer.transform.position.setValueAtTime(startTime + duration, [
                currentPos[0] + (layer.source.width * factor * 0.2),
                currentPos[1] - (layer.source.height * factor * 0.1)
            ]);
            break;
            
        case "rotate_cw":
            layer.transform.rotation.setValueAtTime(startTime, 0);
            layer.transform.rotation.setValueAtTime(startTime + duration, 360 * factor);
            break;
            
        case "rotate_ccw":
            layer.transform.rotation.setValueAtTime(startTime, 0);
            layer.transform.rotation.setValueAtTime(startTime + duration, -360 * factor);
            break;
            
        case "float":
            // 위아래로 부드럽게 떠다니는 효과 - Expression 사용
            layer.transform.position.expression = 
                "value + [0, Math.sin(time * 2 * Math.PI / " + duration + ") * " + (30 * factor) + "]";
            break;
            
        case "pulse":
            // 살짝 커졌다 작아졌다 반복
            layer.transform.scale.expression = 
                "var amp = " + (factor * 10) + ";" +
                "var freq = 2;" +
                "value + [Math.sin(time * freq * 2 * Math.PI) * amp, Math.sin(time * freq * 2 * Math.PI) * amp]";
            break;
            
        case "shake":
            layer.transform.position.expression = 
                "var freq = 5; var amp = " + (20 * factor) + ";" +
                "var x = Math.sin(time * freq * 6.28) * amp;" +
                "var y = Math.cos(time * freq * 4.71) * amp * 0.7;" +
                "value + [x, y]";
            break;
    }
    
    // 이징 적용 (키프레임이 있는 경우)
    applyEasing(layer.transform.scale, animation.easing);
    applyEasing(layer.transform.position, animation.easing);
}

function applyEasing(property, easingType) {
    if (property.numKeys < 2) return;
    
    for (var i = 1; i <= property.numKeys; i++) {
        var easeIn = new KeyframeEase(0, 33);
        var easeOut = new KeyframeEase(0, 33);
        
        switch (easingType) {
            case "ease_in":
                easeIn = new KeyframeEase(0, 75);
                easeOut = new KeyframeEase(0, 33);
                break;
            case "ease_out":
                easeIn = new KeyframeEase(0, 33);
                easeOut = new KeyframeEase(0, 75);
                break;
            case "ease_in_out":
                easeIn = new KeyframeEase(0, 75);
                easeOut = new KeyframeEase(0, 75);
                break;
            case "linear":
            default:
                easeIn = new KeyframeEase(0, 33);
                easeOut = new KeyframeEase(0, 33);
                break;
        }
        
        var dims = property.value.length || 1;
        var easeInArr = [];
        var easeOutArr = [];
        for (var d = 0; d < dims; d++) {
            easeInArr.push(easeIn);
            easeOutArr.push(easeOut);
        }
        
        property.setTemporalEaseAtKey(i, easeInArr, easeOutArr);
    }
}

// ============================================================
// [6a] 캐릭터 리깅: 액션 프리셋 적용
// ============================================================
function applyActionPreset(action, breatheJoints, nodJoints, swayJoints, bendJoints, bobJoints, shakeJoints, allJoints) {
    // 액션 프리셋별 기본 관절 설정 (관절이 없는 경우 자동 생성)
    // ★ 모든 프리셋 값을 미세하게 설정 (살아있는 일러스트 느낌)
    var presets = {
        idle: {
            breathe: { amount: 2, speed: 0.3, phase: 0 },
            nod: { amount: 2, speed: 0.25, phase: 90 },
            sway: null, bend: null, bob: null, shake: null
        },
        talking: {
            breathe: { amount: 2, speed: 0.35, phase: 0 },
            nod: { amount: 3, speed: 0.6, phase: 0 },
            sway: { amount: 2, speed: 0.4, phase: 45 },
            bend: null, bob: null, shake: null
        },
        waving: {
            breathe: { amount: 2, speed: 0.3, phase: 0 },
            nod: { amount: 2, speed: 0.35, phase: 30 },
            sway: { amount: 3, speed: 0.5, phase: 0 },
            bend: { amount: 6, speed: 0.6, phase: 0 },
            bob: null, shake: null
        },
        walking: {
            breathe: { amount: 2, speed: 0.7, phase: 0 },
            nod: { amount: 2, speed: 0.7, phase: 180 },
            sway: { amount: 4, speed: 0.7, phase: 0 },
            bend: { amount: 5, speed: 0.7, phase: 90 },
            bob: { amount: 3, speed: 0.7, phase: 0 },
            shake: null
        },
        scared: {
            breathe: { amount: 3, speed: 0.8, phase: 0 },
            nod: { amount: 2, speed: 1.0, phase: 0 },
            sway: null,
            bend: { amount: 3, speed: 0.8, phase: 45 },
            bob: null,
            shake: { amount: 3, speed: 1.2, phase: 0 }
        },
        angry: {
            breathe: { amount: 3, speed: 0.5, phase: 0 },
            nod: { amount: 3, speed: 0.4, phase: 0 },
            sway: { amount: 2, speed: 0.35, phase: 0 },
            bend: null, bob: null,
            shake: { amount: 2, speed: 0.8, phase: 0 }
        },
        happy: {
            breathe: { amount: 2, speed: 0.4, phase: 0 },
            nod: { amount: 3, speed: 0.5, phase: 0 },
            sway: { amount: 3, speed: 0.45, phase: 0 },
            bend: { amount: 4, speed: 0.5, phase: 30 },
            bob: { amount: 3, speed: 0.5, phase: 0 },
            shake: null
        },
        sad: {
            breathe: { amount: 3, speed: 0.2, phase: 0 },
            nod: { amount: 3, speed: 0.15, phase: 0 },
            sway: { amount: 1, speed: 0.2, phase: 0 },
            bend: null, bob: null, shake: null
        },
        thinking: {
            breathe: { amount: 2, speed: 0.3, phase: 0 },
            nod: { amount: 2, speed: 0.2, phase: 45 },
            sway: { amount: 2, speed: 0.25, phase: 90 },
            bend: null, bob: null, shake: null
        },
        pointing: {
            breathe: { amount: 2, speed: 0.3, phase: 0 },
            nod: { amount: 2, speed: 0.25, phase: 0 },
            sway: { amount: 2, speed: 0.3, phase: 0 },
            bend: { amount: 5, speed: 0.35, phase: 0 },
            bob: null, shake: null
        },
        running: {
            breathe: { amount: 3, speed: 1.0, phase: 0 },
            nod: { amount: 2, speed: 1.0, phase: 180 },
            sway: { amount: 5, speed: 1.0, phase: 0 },
            bend: { amount: 6, speed: 1.0, phase: 90 },
            bob: { amount: 4, speed: 1.0, phase: 0 },
            shake: null
        },
        sleeping: {
            breathe: { amount: 3, speed: 0.15, phase: 0 },
            nod: { amount: 1, speed: 0.1, phase: 90 },
            sway: null, bend: null, bob: null, shake: null
        }
    };

    var preset = presets[action] || presets.idle;

    // 기존 관절이 없을 때 프리셋 값으로 채움
    if (breatheJoints.length === 0 && preset.breathe) {
        breatheJoints.push({ name: "body", part: "torso", x: 0, y: 0, motion: "breathe",
            amount: preset.breathe.amount, speed: preset.breathe.speed, phase: preset.breathe.phase, anchor: null });
    }
    if (nodJoints.length === 0 && preset.nod) {
        nodJoints.push({ name: "head", part: "head", x: 0, y: 0, motion: "nod",
            amount: preset.nod.amount, speed: preset.nod.speed, phase: preset.nod.phase, anchor: null });
    }
    if (swayJoints.length === 0 && preset.sway) {
        swayJoints.push({ name: "body_sway", part: "torso", x: 0, y: 0, motion: "swing",
            amount: preset.sway.amount, speed: preset.sway.speed, phase: preset.sway.phase, anchor: null });
    }
    if (bobJoints.length === 0 && preset.bob) {
        bobJoints.push({ name: "body_bob", part: "torso", x: 0, y: 0, motion: "bob",
            amount: preset.bob.amount, speed: preset.bob.speed, phase: preset.bob.phase, anchor: null });
    }
    if (shakeJoints.length === 0 && preset.shake) {
        shakeJoints.push({ name: "body_shake", part: "torso", x: 0, y: 0, motion: "shake",
            amount: preset.shake.amount, speed: preset.shake.speed, phase: preset.shake.phase, anchor: null });
    }

    // 기존 관절의 amount/speed를 프리셋 값으로 보정 (프리셋 오버라이드)
    if (breatheJoints.length > 0 && preset.breathe) {
        breatheJoints[0].amount = Math.max(breatheJoints[0].amount, preset.breathe.amount);
        breatheJoints[0].speed = preset.breathe.speed;
    }
    if (nodJoints.length > 0 && preset.nod) {
        nodJoints[0].speed = preset.nod.speed;
    }
}

// ============================================================
// [6b] 이펙트 적용
// ============================================================
function applyEffects(layer, effects, startTime) {
    if (!effects || effects.length === 0) return;

    for (var i = 0; i < effects.length; i++) {
        var effect = effects[i];
        if (!effect || !effect.type) continue;
        var p = effect.params || {};
        var effectStart = startTime + (effect.start_time || 0);

        try {
            switch (effect.type) {
                case "drop_shadow":
                    var ds = layer.Effects.addProperty("ADBE Drop Shadow");
                    safeSetValue(ds.property("ADBE Drop Shadow-0001"), Number(p.opacity || 0.5) * 255);
                    safeSetValue(ds.property("ADBE Drop Shadow-0002"), Number(p.direction || p.angle || 135));
                    safeSetValue(ds.property("ADBE Drop Shadow-0003"), Number(p.distance || 10));
                    safeSetValue(ds.property("ADBE Drop Shadow-0004"), Number(p.softness || 10));
                    break;

                case "glow":
                    var glow = layer.Effects.addProperty("ADBE Glo2");
                    safeSetValue(glow.property("ADBE Glo2-0001"), Number(p.threshold || 60));
                    safeSetValue(glow.property("ADBE Glo2-0002"), Number(p.radius || 30));
                    safeSetValue(glow.property("ADBE Glo2-0003"), Number(p.intensity || 1));
                    break;

                case "blur":
                case "gaussian_blur":
                    var blur = layer.Effects.addProperty("ADBE Gaussian Blur 2");
                    safeSetValue(blur.property("ADBE Gaussian Blur 2-0001"), Number(p.amount || 10));
                    break;

                case "vignette":
                    try {
                        var ccVignette = layer.Effects.addProperty("CC Vignette");
                        safeSetValue(ccVignette.property(1), Number(p.amount || 50));
                    } catch(ve) {}
                    break;

                case "grain":
                    var grain = layer.Effects.addProperty("ADBE Noise2");
                    safeSetValue(grain.property("ADBE Noise2-0001"), Number(p.amount || 5));
                    break;

                case "light_sweep":
                    try {
                        var sweep = layer.Effects.addProperty("CC Light Sweep");
                        var sweepDur = (effect.end_time || effectStart + 1.5) - (effect.start_time || 0);
                        sweep.property(1).setValueAtTime(effectStart, -100);
                        sweep.property(1).setValueAtTime(effectStart + Math.max(sweepDur, 0.5), 1200);
                        safeSetValue(sweep.property(5), Number(p.width || 200));
                        safeSetValue(sweep.property(6), Number(p.intensity || p.speed || 0.5));
                    } catch(se) {}
                    break;

                case "color_correction":
                    try {
                        var cc = layer.Effects.addProperty("ADBE CurvesCustom");
                    } catch(ce) {}
                    break;

                case "lens_flare":
                    var flare = layer.Effects.addProperty("ADBE Lens Flare");
                    safeSetValue(flare.property("ADBE Lens Flare-0001"), Number(p.brightness || p.intensity || 100));
                    safeSetValue(flare.property("ADBE Lens Flare-0002"), Number(p.type || 2));
                    break;
            }
        } catch(effectErr) {
            // 개별 이펙트 실패 시 무시하고 다음으로
        }
    }
}

// ============================================================
// [7] 장면 전환 (트랜지션)
// ============================================================
function applyTransition(comp, currentLayer, nextLayer, transition, transitionStart) {
    if (!transition || transition.type === "none" || transition.type === "cut") return;
    
    var dur = transition.duration || 1;
    
    switch (transition.type) {
        case "fade":
            currentLayer.transform.opacity.setValueAtTime(transitionStart, 100);
            currentLayer.transform.opacity.setValueAtTime(transitionStart + dur, 0);
            break;
            
        case "crossfade":
            currentLayer.transform.opacity.setValueAtTime(transitionStart, 100);
            currentLayer.transform.opacity.setValueAtTime(transitionStart + dur, 0);
            if (nextLayer) {
                nextLayer.startTime = transitionStart;
                nextLayer.transform.opacity.setValueAtTime(transitionStart, 0);
                nextLayer.transform.opacity.setValueAtTime(transitionStart + dur, 100);
            }
            break;
            
        case "morph":
            // 모프 트랜지션 - Reshape + 블러 조합으로 구현
            // 1단계: 현재 장면 블러 + 축소
            var blurOut = currentLayer.Effects.addProperty("ADBE Gaussian Blur 2");
            blurOut.property("ADBE Gaussian Blur 2-0001").setValueAtTime(transitionStart, 0);
            blurOut.property("ADBE Gaussian Blur 2-0001").setValueAtTime(transitionStart + dur * 0.5, 30);
            
            currentLayer.transform.opacity.setValueAtTime(transitionStart, 100);
            currentLayer.transform.opacity.setValueAtTime(transitionStart + dur * 0.6, 0);
            
            var scaleVal = currentLayer.transform.scale.value;
            currentLayer.transform.scale.setValueAtTime(transitionStart, scaleVal);
            currentLayer.transform.scale.setValueAtTime(transitionStart + dur * 0.5, [
                scaleVal[0] * 0.95, scaleVal[1] * 0.95
            ]);
            
            // 2단계: 다음 장면 블러에서 선명하게
            if (nextLayer) {
                nextLayer.startTime = transitionStart + dur * 0.3;
                nextLayer.transform.opacity.setValueAtTime(transitionStart + dur * 0.3, 0);
                nextLayer.transform.opacity.setValueAtTime(transitionStart + dur, 100);
                
                var blurIn = nextLayer.Effects.addProperty("ADBE Gaussian Blur 2");
                blurIn.property("ADBE Gaussian Blur 2-0001").setValueAtTime(transitionStart + dur * 0.3, 30);
                blurIn.property("ADBE Gaussian Blur 2-0001").setValueAtTime(transitionStart + dur, 0);
            }
            break;
            
        case "slide_left":
            currentLayer.transform.position.setValueAtTime(transitionStart, currentLayer.transform.position.value);
            currentLayer.transform.position.setValueAtTime(transitionStart + dur, [
                -comp.width / 2, currentLayer.transform.position.value[1]
            ]);
            if (nextLayer) {
                var nextPos = nextLayer.transform.position.value;
                nextLayer.startTime = transitionStart;
                nextLayer.transform.position.setValueAtTime(transitionStart, [comp.width * 1.5, nextPos[1]]);
                nextLayer.transform.position.setValueAtTime(transitionStart + dur, nextPos);
            }
            break;
            
        case "slide_right":
            currentLayer.transform.position.setValueAtTime(transitionStart, currentLayer.transform.position.value);
            currentLayer.transform.position.setValueAtTime(transitionStart + dur, [
                comp.width * 1.5, currentLayer.transform.position.value[1]
            ]);
            if (nextLayer) {
                var nextPos = nextLayer.transform.position.value;
                nextLayer.startTime = transitionStart;
                nextLayer.transform.position.setValueAtTime(transitionStart, [-comp.width / 2, nextPos[1]]);
                nextLayer.transform.position.setValueAtTime(transitionStart + dur, nextPos);
            }
            break;
            
        case "zoom_transition":
            var scaleVal = currentLayer.transform.scale.value;
            currentLayer.transform.scale.setValueAtTime(transitionStart, scaleVal);
            currentLayer.transform.scale.setValueAtTime(transitionStart + dur, [
                scaleVal[0] * 3, scaleVal[1] * 3
            ]);
            currentLayer.transform.opacity.setValueAtTime(transitionStart + dur * 0.7, 100);
            currentLayer.transform.opacity.setValueAtTime(transitionStart + dur, 0);
            
            if (nextLayer) {
                nextLayer.startTime = transitionStart + dur * 0.5;
                nextLayer.transform.opacity.setValueAtTime(transitionStart + dur * 0.5, 0);
                nextLayer.transform.opacity.setValueAtTime(transitionStart + dur, 100);
                var ns = nextLayer.transform.scale.value;
                nextLayer.transform.scale.setValueAtTime(transitionStart + dur * 0.5, [ns[0] * 0.3, ns[1] * 0.3]);
                nextLayer.transform.scale.setValueAtTime(transitionStart + dur, ns);
            }
            break;
            
        case "blur_transition":
            var blurFx = currentLayer.Effects.addProperty("ADBE Gaussian Blur 2");
            blurFx.property("ADBE Gaussian Blur 2-0001").setValueAtTime(transitionStart, 0);
            blurFx.property("ADBE Gaussian Blur 2-0001").setValueAtTime(transitionStart + dur, 50);
            currentLayer.transform.opacity.setValueAtTime(transitionStart + dur * 0.8, 100);
            currentLayer.transform.opacity.setValueAtTime(transitionStart + dur, 0);
            
            if (nextLayer) {
                nextLayer.startTime = transitionStart + dur * 0.3;
                var blurIn = nextLayer.Effects.addProperty("ADBE Gaussian Blur 2");
                blurIn.property("ADBE Gaussian Blur 2-0001").setValueAtTime(transitionStart + dur * 0.3, 50);
                blurIn.property("ADBE Gaussian Blur 2-0001").setValueAtTime(transitionStart + dur, 0);
                nextLayer.transform.opacity.setValueAtTime(transitionStart + dur * 0.3, 0);
                nextLayer.transform.opacity.setValueAtTime(transitionStart + dur, 100);
            }
            break;
            
        case "dissolve":
            currentLayer.transform.opacity.setValueAtTime(transitionStart, 100);
            currentLayer.transform.opacity.setValueAtTime(transitionStart + dur, 0);
            if (nextLayer) {
                nextLayer.startTime = transitionStart;
                nextLayer.transform.opacity.setValueAtTime(transitionStart, 0);
                nextLayer.transform.opacity.setValueAtTime(transitionStart + dur, 100);
            }
            break;
            
        case "wipe_left":
        case "wipe_right":
        case "wipe_circle":
            var wipe = currentLayer.Effects.addProperty("ADBE Linear Wipe");
            wipe.property("ADBE Linear Wipe-0001").setValueAtTime(transitionStart, 0);
            wipe.property("ADBE Linear Wipe-0001").setValueAtTime(transitionStart + dur, 100);
            
            if (transition.type === "wipe_left") {
                wipe.property("ADBE Linear Wipe-0002").setValue(0); // 왼쪽에서
            } else if (transition.type === "wipe_right") {
                wipe.property("ADBE Linear Wipe-0002").setValue(180); // 오른쪽에서
            }
            
            if (nextLayer) {
                nextLayer.startTime = transitionStart;
            }
            break;
    }
}

// ============================================================
// [8] 그림자 이펙트
// ============================================================
function applyDropShadow(layer, shadowConfig) {
    var ds = layer.Effects.addProperty("ADBE Drop Shadow");
    ds.property("ADBE Drop Shadow-0001").setValue((shadowConfig.opacity || 0.5) * 255);
    ds.property("ADBE Drop Shadow-0003").setValue(shadowConfig.distance || 10);
    ds.property("ADBE Drop Shadow-0004").setValue(shadowConfig.softness || 15);
}

// ============================================================
// [9] 오디오 처리
// ============================================================
function handleAudio(comp, data, projectFolder) {
    // BGM 추가
    if (data.audio_global && data.audio_global.bgm) {
        var bgmFile = new File(projectFolder + "/" + data.audio_global.bgm);
        if (bgmFile.exists) {
            var importOpts = new ImportOptions(bgmFile);
            var bgmFootage = app.project.importFile(importOpts);
            var bgmLayer = comp.layers.add(bgmFootage);
            bgmLayer.name = "BGM";
            
            // 볼륨 조절
            var vol = data.audio_global.bgm_volume || 0.3;
            var dbVol = Math.log(vol) / Math.log(10) * 20; // 0~1 → dB 변환
            bgmLayer.audio.audioLevels.setValue([dbVol, dbVol]);
            
            // 페이드 인/아웃
            if (data.audio_global.bgm_fade_in) {
                bgmLayer.audio.audioLevels.setValueAtTime(0, [-96, -96]);
                bgmLayer.audio.audioLevels.setValueAtTime(data.audio_global.bgm_fade_in, [dbVol, dbVol]);
            }
            if (data.audio_global.bgm_fade_out) {
                var fadeStart = comp.duration - data.audio_global.bgm_fade_out;
                bgmLayer.audio.audioLevels.setValueAtTime(fadeStart, [dbVol, dbVol]);
                bgmLayer.audio.audioLevels.setValueAtTime(comp.duration, [-96, -96]);
            }
        }
    }
}

// ============================================================
// [10] 렌더 큐 추가
// ============================================================
function addToRenderQueue(comp, renderSettings) {
    var renderItem = app.project.renderQueue.items.add(comp);

    // 출력 모듈 설정
    var outputModule = renderItem.outputModule(1);

    var format = renderSettings.output_format || "mp4";

    // AE 2023+ 에서는 H.264 템플릿이 제거됨
    // 사용 가능한 템플릿 목록에서 자동으로 찾아 적용
    var templateApplied = false;

    if (format === "mp4") {
        // H.264 관련 템플릿 이름 후보 (AE 버전별로 다름)
        var mp4Templates = [
            "H.264",
            "H.264 - Match Render Settings - 15 Mbps",
            "H.264 - Match Render Settings",
            "MPEG4"
        ];
        var availableTemplates = outputModule.templates;
        for (var t = 0; t < mp4Templates.length; t++) {
            for (var a = 0; a < availableTemplates.length; a++) {
                if (availableTemplates[a] === mp4Templates[t]) {
                    try {
                        outputModule.applyTemplate(mp4Templates[t]);
                        templateApplied = true;
                        break;
                    } catch(e) {}
                }
            }
            if (templateApplied) break;
        }

        // H.264 템플릿을 찾지 못한 경우 (AE 2023+)
        // Lossless로 렌더링 후 Media Encoder로 변환하도록 안내
        if (!templateApplied) {
            try {
                outputModule.applyTemplate("Lossless");
                templateApplied = true;
            } catch(e2) {}

            alert(
                "안내: AE 2023 이상 버전에서는 H.264 렌더 템플릿이 제거되었습니다.\n\n" +
                "Lossless(무손실)로 렌더 큐에 추가했습니다.\n\n" +
                "MP4로 출력하려면:\n" +
                "1. 컴포지션 > Adobe Media Encoder에 추가 (Ctrl+Alt+M)\n" +
                "2. Media Encoder에서 H.264 프리셋 선택\n" +
                "3. 렌더링 시작\n\n" +
                "또는 렌더 큐에서 바로 렌더링하면 AVI/MOV로 출력됩니다."
            );
        }
    } else if (format === "mov") {
        var movTemplates = ["Apple ProRes 422", "Apple ProRes 422 HQ", "Lossless"];
        var availableTemplates2 = outputModule.templates;
        for (var t2 = 0; t2 < movTemplates.length; t2++) {
            for (var a2 = 0; a2 < availableTemplates2.length; a2++) {
                if (availableTemplates2[a2] === movTemplates[t2]) {
                    try {
                        outputModule.applyTemplate(movTemplates[t2]);
                        templateApplied = true;
                        break;
                    } catch(e3) {}
                }
            }
            if (templateApplied) break;
        }
    }

    // 어떤 템플릿도 적용 못한 경우 기본 템플릿 사용
    if (!templateApplied) {
        try {
            outputModule.applyTemplate("Lossless");
        } catch(e4) {
            // 기본 템플릿 그대로 사용
        }
    }

    // 출력 경로
    var outputPath = new File(
        Folder.desktop.fsName + "/" +
        (renderSettings.output_filename || comp.name + "." + format)
    );
    outputModule.file = outputPath;

    return renderItem;
}

// ============================================================
// [JSON 검증] JSON 구조 검증 함수
// ============================================================
function validateJSON(data, projectFolder) {
    var errors = [];
    var warnings = [];

    // 1. 필수 최상위 필드 확인
    if (!data.project) errors.push("'project' 필드가 없습니다");
    if (!data.settings) errors.push("'settings' 필드가 없습니다");
    if (!data.scenes) errors.push("'scenes' 필드가 없습니다");
    if (data.scenes && data.scenes.length === 0) errors.push("씬이 하나도 없습니다");

    // 에러가 있으면 여기서 중단
    if (errors.length > 0) return { valid: false, errors: errors, warnings: warnings };

    // 2. project 필드 확인
    if (!data.project.name) warnings.push("프로젝트 이름이 없습니다 (기본값 'main_comp' 사용)");

    // 3. settings 필드 확인
    var s = data.settings;
    if (!s.width || !s.height) warnings.push("해상도 설정이 없습니다 (기본값 1080x1920 사용)");
    if (!s.fps) warnings.push("FPS 설정이 없습니다 (기본값 30 사용)");
    if (!s.total_duration || s.total_duration <= 0) {
        warnings.push("total_duration이 없거나 0입니다 (씬 합계로 자동 계산)");
    }

    // 4. 씬별 검증
    var totalDuration = 0;
    var missingImages = [];
    for (var i = 0; i < data.scenes.length; i++) {
        var scene = data.scenes[i];
        var sceneLabel = "씬 " + (scene.id || (i + 1));

        // duration 확인
        if (!scene.duration || scene.duration <= 0) {
            errors.push(sceneLabel + ": duration이 없거나 0입니다");
        } else {
            totalDuration += scene.duration;
        }

        // 이미지 파일 존재 확인
        if (scene.image && scene.image.file) {
            var imgPath = new File(projectFolder + "/" + scene.image.file);
            if (!imgPath.exists) {
                missingImages.push(sceneLabel + ": '" + scene.image.file + "' 파일을 찾을 수 없습니다");
            }
        }

        // v2 스키마: layers 확인
        if (scene.layers) {
            for (var j = 0; j < scene.layers.length; j++) {
                var layer = scene.layers[j];
                if (layer.type === "image" && layer.image_source && layer.image_source.file) {
                    var layerImgPath = new File(projectFolder + "/" + layer.image_source.file);
                    if (!layerImgPath.exists) {
                        missingImages.push(sceneLabel + " 레이어 '" + (layer.name || layer.id) + "': '" + layer.image_source.file + "' 파일을 찾을 수 없습니다");
                    }
                }
            }
        }
    }

    // 이미지 누락은 에러로 분류
    for (var m = 0; m < missingImages.length; m++) {
        errors.push(missingImages[m]);
    }

    // 5. 오디오 파일 확인
    if (data.audio_global && data.audio_global.bgm) {
        var bgmPath = new File(projectFolder + "/" + data.audio_global.bgm);
        if (!bgmPath.exists) {
            warnings.push("BGM 파일 '" + data.audio_global.bgm + "'을 찾을 수 없습니다 (무시됨)");
        }
    }

    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings,
        stats: {
            sceneCount: data.scenes.length,
            totalDuration: totalDuration,
            imageCount: missingImages.length === 0 ? "모든 이미지 확인됨" : (missingImages.length + "개 이미지 누락")
        }
    };
}

function showValidationResult(result) {
    var msg = "=== JSON 검증 결과 ===\n\n";

    // 통계
    msg += "씬 수: " + result.stats.sceneCount + "개\n";
    msg += "총 길이: " + result.stats.totalDuration.toFixed(1) + "초\n";
    msg += "이미지: " + result.stats.imageCount + "\n\n";

    if (result.errors.length > 0) {
        msg += "❌ 오류 (" + result.errors.length + "개):\n";
        for (var i = 0; i < result.errors.length; i++) {
            msg += "  • " + result.errors[i] + "\n";
        }
        msg += "\n위 오류를 수정한 후 다시 시도하세요.\n";
        msg += "이미지 파일이 JSON과 같은 폴더에 있는지 확인하세요.";
        alert(msg);
        return false;
    }

    if (result.warnings.length > 0) {
        msg += "⚠ 경고 (" + result.warnings.length + "개):\n";
        for (var w = 0; w < result.warnings.length; w++) {
            msg += "  • " + result.warnings[w] + "\n";
        }
        msg += "\n계속 진행하시겠습니까?";
        return confirm(msg);
    }

    msg += "✅ 문제 없음! 생성을 시작합니다.";
    alert(msg);
    return true;
}

// ============================================================
// [V1 처리] 클래식 방식 (scene.image, scene.text, scene.animation)
// ============================================================
function processV1(comp, data, projectFolder) {
    var currentTime = 0;
    var layers = [];
    var textLayers = [];

    for (var i = 0; i < data.scenes.length; i++) {
        var scene = data.scenes[i];

        var imgLayer = importAndPlaceImage(comp, scene, currentTime, projectFolder);
        if (imgLayer) {
            layers.push(imgLayer);
            if (scene.animation) applySceneAnimation(imgLayer, scene.animation, currentTime, scene.duration);
            if (scene.effects) applyEffects(imgLayer, scene.effects, currentTime);
        }

        var txtLayer = createTextLayer(comp, scene, currentTime);
        if (txtLayer) textLayers.push(txtLayer);

        currentTime += scene.duration;
    }

    // 트랜지션
    currentTime = 0;
    for (var i = 0; i < data.scenes.length - 1; i++) {
        var scene = data.scenes[i];
        currentTime += scene.duration;
        if (scene.transition_to_next && layers[i] && layers[i + 1]) {
            var transStart = currentTime - (scene.transition_to_next.duration || 1);
            applyTransition(comp, layers[i], layers[i + 1], scene.transition_to_next, transStart);
        }
    }
}

// ============================================================
// [V2 처리] 멀티 레이어 방식 (scene.layers[])
// ============================================================
function processV2(comp, data, projectFolder) {
    var currentTime = 0;
    var sceneFirstLayers = [];
    var log = []; // 처리 로그
    var errorLog = []; // 에러 로그

    log.push("v2 엔진 시작 | 폴더: " + projectFolder);
    log.push("씬 수: " + data.scenes.length);

    for (var si = 0; si < data.scenes.length; si++) {
        var scene = data.scenes[si];
        var sceneDur = scene.duration || 4;
        var firstImgLayer = null;

        if (!scene.layers || scene.layers.length === 0) {
            errorLog.push("씬 " + (si+1) + ": layers 배열이 비어있음");
            currentTime += sceneDur;
            sceneFirstLayers.push(null);
            continue;
        }

        log.push("--- 씬 " + (si+1) + " (길이: " + sceneDur + "초, 레이어: " + scene.layers.length + "개) ---");

        for (var li = scene.layers.length - 1; li >= 0; li--) {
            var layerDef = scene.layers[li];
            if (layerDef.visible === false) continue;

            var aeLayer = null;

            // --- 이미지 레이어 ---
            if (layerDef.type === "image" && layerDef.image_source && layerDef.image_source.file) {
                var imgFileName = layerDef.image_source.file;
                var imgPath = new File(projectFolder + "/" + imgFileName);
                log.push("  이미지: " + imgFileName + " → " + imgPath.fsName);

                if (!imgPath.exists) {
                    errorLog.push("씬 " + (si+1) + " '" + (layerDef.name || layerDef.id) + "': 파일 없음 → " + imgPath.fsName);
                } else {
                    try {
                        imgPath = detectAndFixImageFile(imgPath);
                        var importOpts = new ImportOptions(imgPath);
                        var footage = app.project.importFile(importOpts);
                        aeLayer = comp.layers.add(footage);
                        aeLayer.name = layerDef.name || layerDef.id || ("Layer_" + si + "_" + li);

                        aeLayer.startTime = currentTime;
                        aeLayer.inPoint = currentTime;
                        aeLayer.outPoint = currentTime + sceneDur;

                        var fitMode = layerDef.image_source.fit_mode || "contain";
                        var compW = comp.width;
                        var compH = comp.height;
                        var srcW = footage.width;
                        var srcH = footage.height;
                        if (srcW > 0 && srcH > 0) {
                            var scaleX, scaleY;
                            if (fitMode === "cover") {
                                scaleX = scaleY = Math.max(compW / srcW, compH / srcH) * 100;
                            } else if (fitMode === "stretch") {
                                scaleX = (compW / srcW) * 100;
                                scaleY = (compH / srcH) * 100;
                            } else {
                                scaleX = scaleY = Math.min(compW / srcW, compH / srcH) * 100;
                            }
                            aeLayer.property("Scale").setValue([scaleX, scaleY]);
                        }

                        log.push("  → 성공! (" + srcW + "x" + srcH + ")");
                        if (!firstImgLayer) firstImgLayer = aeLayer;
                    } catch (e) {
                        errorLog.push("씬 " + (si+1) + " '" + (layerDef.name || layerDef.id) + "': 임포트 에러 → " + e.toString());
                    }
                }
            }

            // --- 텍스트 레이어 ---
            if (layerDef.type === "text" && layerDef.text_content) {
              try {
                var tc = layerDef.text_content;
                aeLayer = comp.layers.addText(tc.text || "");
                aeLayer.name = layerDef.name || layerDef.id || ("Text_" + si + "_" + li);
                aeLayer.startTime = currentTime;
                aeLayer.inPoint = currentTime;
                aeLayer.outPoint = currentTime + sceneDur;

                // 텍스트 스타일
                var textDoc = aeLayer.property("Source Text").value;
                textDoc.fontSize = tc.font_size || 60;

                // 폰트 설정 - AE는 PostScript 이름 필요
                // "Noto Sans KR" → "NotoSansKR-Bold" 등으로 변환
                var fontWeight = tc.font_weight || "bold";
                var fontFamily = (data.global_style && data.global_style.font_family) || "NotoSansKR";
                // 공백/띄어쓰기 제거 (AE PostScript 이름 형식)
                fontFamily = fontFamily.replace(/\s+/g, "");

                var fontSuffix = "-Regular";
                if (fontWeight === "bold" || fontWeight === "700") fontSuffix = "-Bold";
                else if (fontWeight === "black" || fontWeight === "900") fontSuffix = "-Black";
                else if (fontWeight === "medium" || fontWeight === "500") fontSuffix = "-Medium";
                else if (fontWeight === "light" || fontWeight === "300") fontSuffix = "-Light";

                try {
                    textDoc.font = fontFamily + fontSuffix;
                } catch (fontErr) {
                    // PostScript 이름 실패 시 기본 폰트 사용
                    try {
                        textDoc.font = "Arial-BoldMT";
                    } catch (fontErr2) {
                        // Arial도 없으면 그냥 기본값 유지
                    }
                }
                if (tc.color) {
                    textDoc.fillColor = safeColor(tc.color, [1, 1, 1]);
                }
                textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
                if (tc.alignment === "left") textDoc.justification = ParagraphJustification.LEFT_JUSTIFY;
                if (tc.alignment === "right") textDoc.justification = ParagraphJustification.RIGHT_JUSTIFY;

                // 스트로크
                if (tc.stroke && tc.stroke.enabled) {
                    textDoc.applyStroke = true;
                    textDoc.strokeColor = safeColor(tc.stroke.color, [0, 0, 0]);
                    textDoc.strokeWidth = tc.stroke.width || 3;
                }

                aeLayer.property("Source Text").setValue(textDoc);
              } catch (textErr) {
                errorLog.push("씬 " + (si+1) + " 텍스트 '" + (layerDef.name || layerDef.id) + "': " + textErr.toString());
              }
            }

            // --- 도형 레이어 ---
            if (layerDef.type === "shape" && layerDef.shape_content) {
              try {
                aeLayer = comp.layers.addShape();
                aeLayer.name = layerDef.name || layerDef.id || ("Shape_" + si + "_" + li);
                aeLayer.startTime = currentTime;
                aeLayer.inPoint = currentTime;
                aeLayer.outPoint = currentTime + sceneDur;

                var shapeGroup = aeLayer.property("Contents").addProperty("ADBE Vector Group");
                var sc = layerDef.shape_content;

                // 색상 결정 (다양한 Gemini 출력 형식 대응)
                var shapeColor = safeColor(sc.color, [1, 0, 0]);
                // sc.stroke.color가 있으면 그걸 사용
                if (sc.stroke && sc.stroke.color) {
                    shapeColor = safeColor(sc.stroke.color, shapeColor);
                }
                var strokeWidth = sc.stroke_width || (sc.stroke && sc.stroke.width) || 4;

                if (sc.shape_type === "rectangle" || sc.shape_type === "highlight_box") {
                    var rect = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Rect");
                    // size가 배열 [w,h] 또는 객체 {width,height} 둘 다 처리
                    var rectW = 200, rectH = 100;
                    if (sc.width) rectW = Number(sc.width);
                    if (sc.height) rectH = Number(sc.height);
                    if (sc.size) {
                        if (sc.size instanceof Array) {
                            rectW = Number(sc.size[0]) || rectW;
                            rectH = Number(sc.size[1]) || rectH;
                        } else if (typeof sc.size === "object") {
                            rectW = Number(sc.size.width) || rectW;
                            rectH = Number(sc.size.height) || rectH;
                        }
                    }
                    safeSetValue(rect.property("Size"), [rectW, rectH]);
                } else if (sc.shape_type === "circle") {
                    var ellipse = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
                    var radius = Number(sc.radius) || 50;
                    // size가 있으면 그걸 사용
                    var circleSize = radius * 2;
                    if (sc.size) {
                        if (sc.size instanceof Array) {
                            circleSize = Number(sc.size[0]) || circleSize;
                        } else if (typeof sc.size === "object") {
                            circleSize = Number(sc.size.width) || circleSize;
                        }
                    }
                    safeSetValue(ellipse.property("Size"), [circleSize, circleSize]);
                } else {
                    // arrow, line, underline, connector → 패스로 그림
                    var pathGroup = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Group");
                    var sp = sc.start_point || { x: 0, y: 0 };
                    var ep = sc.end_point || { x: 100, y: 0 };
                    var shapePath = new Shape();
                    shapePath.vertices = [[sp.x || 0, sp.y || 0], [ep.x || 100, ep.y || 0]];
                    shapePath.closed = false;
                    pathGroup.property("Path").setValue(shapePath);
                }

                // 스트로크
                var stroke = shapeGroup.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
                safeSetValue(stroke.property("Color"), shapeColor);
                safeSetValue(stroke.property("Stroke Width"), strokeWidth);

                // 채우기 (fill이 명시적으로 true인 경우만)
                if (sc.fill === true) {
                    var fill = shapeGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");
                    safeSetValue(fill.property("Color"), shapeColor);
                }
              } catch (shapeErr) {
                errorLog.push("씬 " + (si+1) + " 도형 '" + (layerDef.name || layerDef.id) + "': " + shapeErr.toString());
              }
            }

            // --- 캐릭터 리깅 레이어 (CC Bend It 전용 - 부위별 변형) ---
            if (layerDef.type === "puppet" && layerDef.image_source && layerDef.image_source.file) {
              try {
                var puppetFileName = layerDef.image_source.file;
                var puppetPath = new File(projectFolder + "/" + puppetFileName);
                log.push("  캐릭터 리깅: " + puppetFileName);

                if (!puppetPath.exists) {
                    errorLog.push("씬 " + (si+1) + " puppet '" + (layerDef.name || layerDef.id) + "': 파일 없음 → " + puppetPath.fsName);
                } else {
                    puppetPath = detectAndFixImageFile(puppetPath);
                    var puppetImport = new ImportOptions(puppetPath);
                    var puppetFootage = app.project.importFile(puppetImport);
                    aeLayer = comp.layers.add(puppetFootage);
                    aeLayer.name = layerDef.name || layerDef.id || ("Rig_" + si + "_" + li);
                    aeLayer.startTime = currentTime;
                    aeLayer.inPoint = currentTime;
                    aeLayer.outPoint = currentTime + sceneDur;

                    // fit_mode: 기본값 "cover"로 화면 꽉 채움
                    var pFitMode = layerDef.image_source.fit_mode || "cover";
                    var pSrcW = puppetFootage.width;
                    var pSrcH = puppetFootage.height;
                    var pBaseScale = 100;
                    if (pSrcW > 0 && pSrcH > 0) {
                        if (pFitMode === "cover") {
                            pBaseScale = Math.max(comp.width / pSrcW, comp.height / pSrcH) * 100;
                        } else if (pFitMode === "contain") {
                            pBaseScale = Math.min(comp.width / pSrcW, comp.height / pSrcH) * 100;
                        }
                    }

                    var scaleFactor = pBaseScale / 100;

                    // ★★★ Transform 설정 (고정값 - Expression 없음!) ★★★
                    var puppetPosX = comp.width / 2;
                    var puppetPosY = comp.height / 2;
                    if (layerDef.transform && layerDef.transform.position) {
                        puppetPosX = Number(layerDef.transform.position.x) || puppetPosX;
                        puppetPosY = Number(layerDef.transform.position.y) || puppetPosY;
                    }
                    aeLayer.property("Position").setValue([puppetPosX, puppetPosY]);
                    aeLayer.property("Scale").setValue([pBaseScale, pBaseScale]);
                    aeLayer.property("Opacity").setValue(100);
                    log.push("    위치: [" + puppetPosX + ", " + puppetPosY + "] 스케일: " + pBaseScale.toFixed(1) + "% (fit:" + pFitMode + ")");

                    // ★★★ 핵심 설계: 모든 모션은 CC Bend It으로만 구현! ★★★
                    // Transform(Scale/Rotation/Position)에 Expression 걸지 않음 → 이미지 전체가 흔들리지 않음
                    // CC Bend It만 사용 → 특정 부위만 미세하게 변형

                    var joints = layerDef.joints || layerDef.pins || [];
                    var bendIdx = 0;
                    var maxBends = 6; // CC Bend It 최대 개수

                    for (var ji = 0; ji < joints.length && bendIdx < maxBends; ji++) {
                        try {
                            var jDef = joints[ji];
                            var jMotion = jDef.motion || "breathe";
                            var jAmount = Math.min(Number(jDef.amount) || 3, 8); // 최대 8도로 제한
                            var jSpeed = Math.min(Number(jDef.speed) || 0.4, 1.0); // 최대 속도 1.0
                            var jPhase = (Number(jDef.phase) || 0) * Math.PI / 180;
                            var jPart = jDef.part || jDef.name || "body";
                            var jx = Number(jDef.x) || (comp.width / 2);
                            var jy = Number(jDef.y) || (comp.height / 2);

                            // CC Bend It 이펙트 생성
                            var bendEff = aeLayer.property("Effects").addProperty("CC Bend It");
                            bendEff.name = "J_" + (jDef.name || jPart || bendIdx);

                            // 파트별 벤드 방향/길이 자동 결정
                            var bendLen = 50 * scaleFactor;
                            var isHead = (jPart.indexOf("head") >= 0);
                            var isArm = (jPart.indexOf("arm") >= 0 || jPart.indexOf("hand") >= 0);
                            var isTail = (jPart.indexOf("tail") >= 0 || jPart.indexOf("cape") >= 0 || jPart.indexOf("hair") >= 0);
                            var isTorso = (jPart.indexOf("torso") >= 0 || jPart.indexOf("body") >= 0);
                            var isLeg = (jPart.indexOf("leg") >= 0);

                            // Start/End 포인트 설정 (벤드 축 방향)
                            if (isArm || isLeg) {
                                // 팔/다리: 수평 축 벤드
                                bendEff.property("Start").setValue([jx - bendLen, jy]);
                                bendEff.property("End").setValue([jx + bendLen, jy]);
                            } else if (isTail) {
                                // 꼬리/머리카락: 긴 수직 벤드
                                bendEff.property("Start").setValue([jx, Math.max(0, jy - bendLen * 1.5)]);
                                bendEff.property("End").setValue([jx, Math.min(comp.height, jy + bendLen * 1.5)]);
                            } else if (isHead) {
                                // 머리: 짧은 수직 벤드
                                bendEff.property("Start").setValue([jx, Math.max(0, jy - bendLen * 0.8)]);
                                bendEff.property("End").setValue([jx, Math.min(comp.height, jy + bendLen * 0.8)]);
                            } else {
                                // 몸통/기타: 수직 벤드
                                bendEff.property("Start").setValue([jx, Math.max(0, jy - bendLen)]);
                                bendEff.property("End").setValue([jx, Math.min(comp.height, jy + bendLen)]);
                            }

                            // 모션별 벤드 진폭 조정
                            var bendAmt = jAmount;
                            if (jMotion === "breathe") bendAmt = jAmount * 0.5; // 호흡은 매우 미세
                            else if (jMotion === "nod") bendAmt = jAmount * 0.7; // 끄덕임도 미세
                            else if (jMotion === "shake") bendAmt = jAmount * 0.4; // 떨림은 빠르지만 작게

                            // 모션별 Expression
                            if (jMotion === "shake") {
                                // 떨림: 불규칙한 wiggle
                                var skFreq = Math.min(jSpeed * 5, 6);
                                bendEff.property("Bend").expression =
                                    "wiggle(" + skFreq + ", " + bendAmt + ")";
                            } else {
                                // 기본: 부드러운 사인파
                                bendEff.property("Bend").expression =
                                    "var amt = " + bendAmt + ";\n" +
                                    "var spd = " + jSpeed + ";\n" +
                                    "var ph = " + jPhase.toFixed(4) + ";\n" +
                                    "Math.sin(time * spd * Math.PI * 2 + ph) * amt";
                            }

                            bendIdx++;
                            log.push("    CC벤드[" + (bendIdx-1) + "]: " + (jDef.name || jPart) + " [" + jMotion + "] amt:" + bendAmt.toFixed(1) + "° spd:" + jSpeed + " at(" + jx + "," + jy + ")");
                        } catch (jErr) {
                            errorLog.push("씬 " + (si+1) + " joint[" + ji + "]: " + jErr.toString());
                        }
                    }

                    // bend_zones 추가 (고급 변형 영역)
                    if (layerDef.bend_zones && layerDef.bend_zones.length > 0) {
                        for (var bzi = 0; bzi < layerDef.bend_zones.length && bendIdx < maxBends; bzi++) {
                            try {
                                var bz = layerDef.bend_zones[bzi];
                                var bzEffect = aeLayer.property("Effects").addProperty("CC Bend It");
                                bzEffect.name = "Zone_" + (bz.name || bzi);
                                bzEffect.property("Start").setValue([Number(bz.start.x), Number(bz.start.y)]);
                                bzEffect.property("End").setValue([Number(bz.end.x), Number(bz.end.y)]);
                                var bzAmt = Math.min(Number(bz.amount) || 5, 8);
                                var bzSpd = Math.min(Number(bz.speed) || 0.4, 1.0);
                                var bzPh = (Number(bz.phase) || 0) * Math.PI / 180;
                                bzEffect.property("Bend").expression =
                                    "Math.sin(time * " + bzSpd + " * Math.PI * 2 + " + bzPh.toFixed(4) + ") * " + bzAmt;
                                bendIdx++;
                                log.push("    벤드존[" + bzi + "]: " + (bz.name || bzi));
                            } catch (bzErr) {
                                errorLog.push("씬 " + (si+1) + " bend_zone: " + bzErr.toString());
                            }
                        }
                    }

                    // 관절이 전혀 없으면 기본 미세 호흡 벤드 1개 추가
                    if (bendIdx === 0) {
                        try {
                            var defBend = aeLayer.property("Effects").addProperty("CC Bend It");
                            defBend.name = "Default_Breathe";
                            defBend.property("Start").setValue([comp.width / 2, comp.height * 0.3]);
                            defBend.property("End").setValue([comp.width / 2, comp.height * 0.7]);
                            defBend.property("Bend").expression = "Math.sin(time * 0.3 * Math.PI * 2) * 1.5";
                            log.push("    기본 호흡 벤드 적용 (관절 미지정)");
                        } catch (defErr) {}
                    }

                    log.push("  → 캐릭터 리깅 완료! (CC Bend It: " + Math.max(bendIdx, 1) + "개, Transform 고정)");
                    if (!firstImgLayer) firstImgLayer = aeLayer;
                }
              } catch (puppetErr) {
                errorLog.push("씬 " + (si+1) + " puppet '" + (layerDef.name || layerDef.id) + "': " + puppetErr.toString());
              }
            }

            // --- 공통: Transform 적용 (puppet은 위에서 이미 처리됨 → 스킵) ---
            if (aeLayer && layerDef.transform && layerDef.type !== "puppet") {
              try {
                var t = layerDef.transform;
                if (t.position) {
                    safeSetValue(aeLayer.property("Position"), [Number(t.position.x) || 540, Number(t.position.y) || 960]);
                }
                if (t.scale && t.scale instanceof Array && t.scale.length >= 2) {
                    safeSetValue(aeLayer.property("Scale"), [Number(t.scale[0]) || 100, Number(t.scale[1]) || 100]);
                }
                if (t.opacity !== undefined && t.opacity !== null) {
                    safeSetValue(aeLayer.property("Opacity"), Number(t.opacity) || 100);
                }
                if (t.rotation) {
                    safeSetValue(aeLayer.property("Rotation"), Number(t.rotation) || 0);
                }
              } catch(transformErr) {
                errorLog.push("씬 " + (si+1) + " transform '" + (layerDef.name || layerDef.id) + "': " + transformErr.toString());
              }
            }

            // --- 3D 레이어 ---
            if (aeLayer && layerDef.three_d) {
                aeLayer.threeDLayer = true;
                if (layerDef.transform && layerDef.transform.z_position) {
                    var pos3d = aeLayer.property("Position").value;
                    aeLayer.property("Position").setValue([pos3d[0], pos3d[1], layerDef.transform.z_position]);
                }
            }

            // --- Entrance 애니메이션 (puppet 타입은 스킵 → 즉시 표시) ---
            if (aeLayer && layerDef.type === "puppet") {
                // puppet 레이어는 fade_in 없이 즉시 표시 (opacity 100 고정)
                // fade_in 키프레임이 이미지를 숨길 수 있으므로 완전히 건너뜀
            } else if (aeLayer && layerDef.entrance && layerDef.entrance.type !== "none") {
                var ent = layerDef.entrance;
                var entDelay = ent.delay || 0;
                var entDur = ent.duration || 0.8;
                var entStart = currentTime + entDelay;
                var entEnd = entStart + entDur;

                var entType = ent.type || "fade_in";

                // 먼저 시작 시점까지 숨기기
                if (entDelay > 0) {
                    aeLayer.property("Opacity").setValueAtTime(currentTime, 0);
                    aeLayer.property("Opacity").setValueAtTime(entStart, 0);
                }

                if (entType === "fade_in") {
                    aeLayer.property("Opacity").setValueAtTime(entStart, 0);
                    aeLayer.property("Opacity").setValueAtTime(entEnd, layerDef.transform ? (layerDef.transform.opacity || 100) : 100);
                } else if (entType === "scale_up" || entType === "pop") {
                    var targetScale = (layerDef.transform && layerDef.transform.scale) || [100, 100];
                    aeLayer.property("Scale").setValueAtTime(entStart, [0, 0]);
                    aeLayer.property("Scale").setValueAtTime(entEnd, targetScale);
                    if (entDelay > 0) {
                        aeLayer.property("Opacity").setValueAtTime(entStart, 0);
                        aeLayer.property("Opacity").setValueAtTime(entStart + 0.05, 100);
                    }
                } else if (entType === "slide_from_left") {
                    var origPos = aeLayer.property("Position").value;
                    aeLayer.property("Position").setValueAtTime(entStart, [origPos[0] - comp.width, origPos[1]]);
                    aeLayer.property("Position").setValueAtTime(entEnd, origPos);
                    aeLayer.property("Opacity").setValueAtTime(entStart, 0);
                    aeLayer.property("Opacity").setValueAtTime(entStart + 0.1, 100);
                } else if (entType === "slide_from_right") {
                    var origPos = aeLayer.property("Position").value;
                    aeLayer.property("Position").setValueAtTime(entStart, [origPos[0] + comp.width, origPos[1]]);
                    aeLayer.property("Position").setValueAtTime(entEnd, origPos);
                    aeLayer.property("Opacity").setValueAtTime(entStart, 0);
                    aeLayer.property("Opacity").setValueAtTime(entStart + 0.1, 100);
                } else if (entType === "slide_from_bottom") {
                    var origPos = aeLayer.property("Position").value;
                    aeLayer.property("Position").setValueAtTime(entStart, [origPos[0], origPos[1] + comp.height * 0.5]);
                    aeLayer.property("Position").setValueAtTime(entEnd, origPos);
                    aeLayer.property("Opacity").setValueAtTime(entStart, 0);
                    aeLayer.property("Opacity").setValueAtTime(entStart + 0.1, 100);
                } else if (entType === "slide_from_top") {
                    var origPos = aeLayer.property("Position").value;
                    aeLayer.property("Position").setValueAtTime(entStart, [origPos[0], origPos[1] - comp.height * 0.5]);
                    aeLayer.property("Position").setValueAtTime(entEnd, origPos);
                    aeLayer.property("Opacity").setValueAtTime(entStart, 0);
                    aeLayer.property("Opacity").setValueAtTime(entStart + 0.1, 100);
                } else if (entType === "typewriter" || entType === "letter_by_letter" || entType === "word_by_word") {
                    // 타이프라이터: 페이드인으로 대체 (ExtendScript 한계)
                    aeLayer.property("Opacity").setValueAtTime(entStart, 0);
                    aeLayer.property("Opacity").setValueAtTime(entEnd, 100);
                } else if (entType === "wipe_in") {
                    aeLayer.property("Opacity").setValueAtTime(entStart, 0);
                    aeLayer.property("Opacity").setValueAtTime(entEnd, 100);
                } else if (entType === "bounce_in") {
                    var targetScale = (layerDef.transform && layerDef.transform.scale) || [100, 100];
                    aeLayer.property("Scale").setValueAtTime(entStart, [0, 0]);
                    aeLayer.property("Scale").setValueAtTime(entEnd * 0.7, [targetScale[0] * 1.2, targetScale[1] * 1.2]);
                    aeLayer.property("Scale").setValueAtTime(entEnd, targetScale);
                } else if (entType === "fly_in_3d" || entType === "flip_in" || entType === "spin_in") {
                    // 3D 등장 → scale_up + fade_in 조합
                    var targetScale = (layerDef.transform && layerDef.transform.scale) || [100, 100];
                    aeLayer.property("Scale").setValueAtTime(entStart, [targetScale[0] * 0.3, targetScale[1] * 0.3]);
                    aeLayer.property("Scale").setValueAtTime(entEnd, targetScale);
                    aeLayer.property("Opacity").setValueAtTime(entStart, 0);
                    aeLayer.property("Opacity").setValueAtTime(entEnd, 100);
                } else {
                    // 기본: fade_in
                    aeLayer.property("Opacity").setValueAtTime(entStart, 0);
                    aeLayer.property("Opacity").setValueAtTime(entEnd, 100);
                }
            }

            // --- 지속 애니메이션 ---
            if (aeLayer && layerDef.animation && layerDef.animation.type !== "none") {
                var anim = layerDef.animation;
                var animType = anim.type;
                var intensity = anim.intensity || "normal";
                var intensityMap = { subtle: 0.1, normal: 0.2, strong: 0.4 };
                var mult = intensityMap[intensity] || 0.2;
                var animStart = currentTime;
                var animEnd = currentTime + sceneDur;

                if (animType === "float" || animType === "bob" || animType === "breathe" || animType === "sway" || animType === "subtle_sway") {
                    // Expression 기반 부드러운 움직임
                    var freq = (anim.speed || 1) * 2;
                    var ampY = 10 * (mult / 0.2);
                    try {
                        aeLayer.property("Position").expression =
                            "var p = value; [p[0], p[1] + Math.sin(time * " + freq + ") * " + ampY + "]";
                    } catch(ex) {
                        // expression 실패시 키프레임으로 대체
                        var pos = aeLayer.property("Position").value;
                        aeLayer.property("Position").setValueAtTime(animStart, pos);
                        aeLayer.property("Position").setValueAtTime((animStart + animEnd) / 2, [pos[0], pos[1] - ampY]);
                        aeLayer.property("Position").setValueAtTime(animEnd, pos);
                    }
                } else if (animType === "pulse") {
                    var sc = aeLayer.property("Scale").value;
                    var pulseAmt = 5 * (mult / 0.2);
                    try {
                        aeLayer.property("Scale").expression =
                            "var s = value; var p = Math.sin(time * 3) * " + pulseAmt + "; [s[0]+p, s[1]+p]";
                    } catch(ex) {}
                } else if (animType === "shake") {
                    var shakeAmt = 5 * (mult / 0.2);
                    try {
                        aeLayer.property("Position").expression =
                            "var p = value; [p[0] + wiggle(8," + shakeAmt + ")[0] - p[0], p[1] + wiggle(8," + shakeAmt + ")[1] - p[1]]";
                    } catch(ex) {}
                } else if (animType === "rotate_slow") {
                    aeLayer.property("Rotation").setValueAtTime(animStart, 0);
                    aeLayer.property("Rotation").setValueAtTime(animEnd, 360 * mult);
                } else if (animType === "zoom_in") {
                    var sc = aeLayer.property("Scale").value;
                    aeLayer.property("Scale").setValueAtTime(animStart, sc);
                    aeLayer.property("Scale").setValueAtTime(animEnd, [sc[0] * (1 + mult), sc[1] * (1 + mult)]);
                } else if (animType === "zoom_out") {
                    var sc = aeLayer.property("Scale").value;
                    aeLayer.property("Scale").setValueAtTime(animStart, sc);
                    aeLayer.property("Scale").setValueAtTime(animEnd, [sc[0] * (1 - mult), sc[1] * (1 - mult)]);
                } else if (animType === "ken_burns") {
                    var sc = aeLayer.property("Scale").value;
                    var pos = aeLayer.property("Position").value;
                    aeLayer.property("Scale").setValueAtTime(animStart, sc);
                    aeLayer.property("Scale").setValueAtTime(animEnd, [sc[0] * (1 + mult), sc[1] * (1 + mult)]);
                    aeLayer.property("Position").setValueAtTime(animStart, pos);
                    aeLayer.property("Position").setValueAtTime(animEnd, [pos[0] + comp.width * mult * 0.1, pos[1]]);
                } else if (animType === "pan_left" || animType === "pan_right" || animType === "pan_up" || animType === "pan_down") {
                    var pos = aeLayer.property("Position").value;
                    var panDist = comp.width * mult * 0.3;
                    var dx = 0, dy = 0;
                    if (animType === "pan_left") dx = -panDist;
                    if (animType === "pan_right") dx = panDist;
                    if (animType === "pan_up") dy = -panDist;
                    if (animType === "pan_down") dy = panDist;
                    aeLayer.property("Position").setValueAtTime(animStart, pos);
                    aeLayer.property("Position").setValueAtTime(animEnd, [pos[0] + dx, pos[1] + dy]);
                }
            }

            // --- Exit 애니메이션 ---
            if (aeLayer && layerDef.exit && layerDef.exit.type !== "none") {
                var ex = layerDef.exit;
                var exitDur = ex.duration || 0.5;
                var exitBefore = ex.time_before_end || 0.5;
                var exitStart = currentTime + sceneDur - exitBefore - exitDur;
                var exitEnd = currentTime + sceneDur - exitBefore;

                if (ex.type === "fade_out") {
                    aeLayer.property("Opacity").setValueAtTime(exitStart, 100);
                    aeLayer.property("Opacity").setValueAtTime(exitEnd, 0);
                } else if (ex.type === "scale_down") {
                    var sc = aeLayer.property("Scale").value;
                    aeLayer.property("Scale").setValueAtTime(exitStart, sc);
                    aeLayer.property("Scale").setValueAtTime(exitEnd, [0, 0]);
                } else if (ex.type === "slide_to_left" || ex.type === "slide_to_right") {
                    var pos = aeLayer.property("Position").value;
                    var offX = ex.type === "slide_to_left" ? -comp.width : comp.width;
                    aeLayer.property("Position").setValueAtTime(exitStart, pos);
                    aeLayer.property("Position").setValueAtTime(exitEnd, [pos[0] + offX, pos[1]]);
                }
            }

            // --- 이펙트 ---
            if (aeLayer && layerDef.effects) {
                applyEffects(aeLayer, layerDef.effects, currentTime);
            }
        }

        // 씬의 첫 번째 이미지 레이어 저장 (전환용)
        sceneFirstLayers.push(firstImgLayer);

        currentTime += sceneDur;
    }

    // 씬 간 전환 처리
    currentTime = 0;
    for (var i = 0; i < data.scenes.length - 1; i++) {
        currentTime += data.scenes[i].duration;
        var trans = data.scenes[i].transition_to_next;
        if (trans && sceneFirstLayers[i] && sceneFirstLayers[i + 1]) {
            var transStart = currentTime - (trans.duration || 1);
            applyTransition(comp, sceneFirstLayers[i], sceneFirstLayers[i + 1], trans, transStart);
        }
    }

    // 처리 결과 로그 표시
    if (errorLog.length > 0) {
        var errMsg = "=== v2 처리 결과 ===\n\n";
        errMsg += "❌ 에러 " + errorLog.length + "개:\n";
        for (var ei = 0; ei < errorLog.length; ei++) {
            errMsg += "  • " + errorLog[ei] + "\n";
        }
        errMsg += "\n=== 처리 로그 ===\n";
        for (var li2 = 0; li2 < Math.min(log.length, 30); li2++) {
            errMsg += log[li2] + "\n";
        }
        alert(errMsg);
    }
}

// ============================================================
// [MAIN] 메인 실행 함수
// ============================================================
function main() {
    // JSON 파일 선택
    var jsonFile = File.openDialog("스토리보드 JSON 파일을 선택하세요", "JSON Files:*.json");
    if (!jsonFile) return;

    var projectFolder = jsonFile.parent.fsName;

    // JSON 로드
    var data = loadJSON(jsonFile.fsName);
    if (!data) return;

    // JSON 검증
    var validation = validateJSON(data, projectFolder);
    if (!showValidationResult(validation)) return;

    // 언두 그룹 시작
    app.beginUndoGroup("AE Auto Pipeline");

    try {
        // v1 vs v2 감지: v2는 scenes[].layers 배열이 있음
        var isV2 = data.scenes[0] && data.scenes[0].layers && data.scenes[0].layers.length > 0;

        // 1. 프로젝트 생성
        var comp = createProject(data);

        if (isV2) {
            processV2(comp, data, projectFolder);
        } else {
            processV1(comp, data, projectFolder);
        }

        // 오디오 처리
        handleAudio(comp, data, projectFolder);

        // 렌더 큐에 추가
        if (data.render) {
            addToRenderQueue(comp, data.render);
        }

        alert("영상 생성 완료!\n\n" +
              "모드: " + (isV2 ? "v2 (멀티 레이어)" : "v1 (클래식)") + "\n" +
              "장면 수: " + data.scenes.length + "\n" +
              "총 길이: " + comp.duration + "초\n" +
              "해상도: " + comp.width + "x" + comp.height + "\n\n" +
              "렌더 큐에서 렌더링을 시작하세요.");
              
    } catch (e) {
        var errMsg = "에러 발생: " + e.toString();
        if (e.line) errMsg += "\n줄 번호: " + e.line;
        if (e.source) errMsg += "\n소스: " + e.source.substring(0, 200);
        alert(errMsg);
    }
    
    app.endUndoGroup();
}

// 실행
main();
