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
    
    // 메인 컴포지션 생성
    var comp = project.items.addComp(
        data.project.name,           // 이름
        settings.width,              // 너비
        settings.height,             // 높이
        1,                           // 픽셀 비율
        settings.total_duration,     // 총 길이 (초)
        settings.fps                 // FPS
    );
    
    // 배경색 설정
    var bg = settings.background_color;
    var bgSolid = comp.layers.addSolid(
        bg, 
        "Background", 
        settings.width, 
        settings.height, 
        1, 
        settings.total_duration
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
    
    // 이미지 임포트
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
// [6] 이펙트 적용
// ============================================================
function applyEffects(layer, effects, startTime) {
    if (!effects || effects.length === 0) return;
    
    for (var i = 0; i < effects.length; i++) {
        var effect = effects[i];
        var effectStart = startTime + (effect.start_time || 0);
        
        switch (effect.type) {
            case "drop_shadow":
                var ds = layer.Effects.addProperty("ADBE Drop Shadow");
                ds.property("ADBE Drop Shadow-0001").setValue(effect.params.opacity * 255 || 128);
                ds.property("ADBE Drop Shadow-0002").setValue(effect.params.direction || 135);
                ds.property("ADBE Drop Shadow-0003").setValue(effect.params.distance || 10);
                ds.property("ADBE Drop Shadow-0004").setValue(effect.params.softness || 10);
                break;
                
            case "glow":
                var glow = layer.Effects.addProperty("ADBE Glo2");
                glow.property("ADBE Glo2-0001").setValue(effect.params.threshold || 60);
                glow.property("ADBE Glo2-0002").setValue(effect.params.radius || 30);
                glow.property("ADBE Glo2-0003").setValue(effect.params.intensity || 1);
                break;
                
            case "blur":
                var blur = layer.Effects.addProperty("ADBE Gaussian Blur 2");
                blur.property("ADBE Gaussian Blur 2-0001").setValue(effect.params.amount || 10);
                break;
                
            case "vignette":
                // 비네팅 효과 - 조정 레이어로 구현
                var vignette = layer.Effects.addProperty("ADBE Radial Wipe");
                // 심플하게 CC Vignette 사용
                var ccVignette = layer.Effects.addProperty("CC Vignette");
                ccVignette.property(1).setValue(effect.params.amount || 50);
                break;
                
            case "grain":
                var grain = layer.Effects.addProperty("ADBE Noise2");
                grain.property("ADBE Noise2-0001").setValue(effect.params.amount || 5);
                break;
                
            case "light_sweep":
                var sweep = layer.Effects.addProperty("CC Light Sweep");
                sweep.property(1).setValueAtTime(effectStart, -100);
                sweep.property(1).setValueAtTime(
                    effectStart + (effect.end_time - effect.start_time || 1.5), 
                    layer.source.width + 100
                );
                sweep.property(5).setValue(effect.params.width || 200);
                sweep.property(6).setValue(effect.params.intensity || 0.5);
                break;
                
            case "color_correction":
                var cc = layer.Effects.addProperty("ADBE CurvesCustom");
                // 밝기/대비 기본 보정
                break;
                
            case "lens_flare":
                var flare = layer.Effects.addProperty("ADBE Lens Flare");
                flare.property("ADBE Lens Flare-0001").setValue(effect.params.brightness || 100);
                flare.property("ADBE Lens Flare-0002").setValue(effect.params.type || 2);
                break;
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
function handleAudio(comp, data) {
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
    if (format === "mp4") {
        outputModule.applyTemplate("H.264");
    } else if (format === "mov") {
        outputModule.applyTemplate("Apple ProRes 422");
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
    
    // 언두 그룹 시작
    app.beginUndoGroup("AE Auto Pipeline");
    
    try {
        // 1. 프로젝트 생성
        var comp = createProject(data);
        
        // 2. 장면별 처리
        var currentTime = 0;
        var layers = [];
        var textLayers = [];
        
        for (var i = 0; i < data.scenes.length; i++) {
            var scene = data.scenes[i];
            
            // 이미지 배치
            var imgLayer = importAndPlaceImage(comp, scene, currentTime, projectFolder);
            if (imgLayer) {
                layers.push(imgLayer);
                
                // 장면 애니메이션 적용
                applySceneAnimation(imgLayer, scene.animation, currentTime, scene.duration);
                
                // 이펙트 적용
                applyEffects(imgLayer, scene.effects, currentTime);
            }
            
            // 텍스트 배치
            var txtLayer = createTextLayer(comp, scene, currentTime);
            if (txtLayer) {
                textLayers.push(txtLayer);
            }
            
            // 다음 시간으로 이동 (전환 시간은 겹침)
            var transitionDur = 0;
            if (scene.transition_to_next) {
                transitionDur = scene.transition_to_next.duration || 0;
            }
            
            currentTime += scene.duration;
        }
        
        // 3. 트랜지션 적용 (장면 사이)
        currentTime = 0;
        for (var i = 0; i < data.scenes.length - 1; i++) {
            var scene = data.scenes[i];
            currentTime += scene.duration;
            
            if (scene.transition_to_next && layers[i] && layers[i + 1]) {
                var transStart = currentTime - (scene.transition_to_next.duration || 1);
                applyTransition(comp, layers[i], layers[i + 1], scene.transition_to_next, transStart);
            }
        }
        
        // 4. 오디오 처리
        handleAudio(comp, data);
        
        // 5. 렌더 큐에 추가
        if (data.render) {
            addToRenderQueue(comp, data.render);
        }
        
        alert("영상 생성 완료!\n\n" +
              "장면 수: " + data.scenes.length + "\n" +
              "총 길이: " + comp.duration + "초\n" +
              "해상도: " + comp.width + "x" + comp.height + "\n\n" +
              "렌더 큐에서 렌더링을 시작하세요.");
              
    } catch (e) {
        alert("에러 발생: " + e.toString());
    }
    
    app.endUndoGroup();
}

// 실행
main();
