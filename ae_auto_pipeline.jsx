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

// 파일 헤더를 읽어서 실제 이미지 포맷 감지 → 확장자 불일치 시 원본을 RENAME
function detectAndFixImageFile(filePath) {
    var f = new File(filePath);
    if (!f.exists) return f;

    f.open("r");
    f.encoding = "BINARY";
    var header = f.read(4);
    f.close();

    var actualExt = "";
    if (header.length >= 4) {
        var b0 = header.charCodeAt(0), b1 = header.charCodeAt(1);
        var b2 = header.charCodeAt(2), b3 = header.charCodeAt(3);
        if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47) actualExt = ".png";
        else if (b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF) actualExt = ".jpg";
        else if (b0 === 0x47 && b1 === 0x49 && b2 === 0x46) actualExt = ".gif";
        else if (b0 === 0x42 && b1 === 0x4D) actualExt = ".bmp";
        else if (b0 === 0x52 && b1 === 0x49 && b2 === 0x46 && b3 === 0x46) actualExt = ".webp";
    }
    if (!actualExt) return f;

    var currentName = f.name;
    var dotIdx = currentName.lastIndexOf(".");
    var currentExt = dotIdx >= 0 ? currentName.slice(dotIdx).toLowerCase() : "";
    if (currentExt === actualExt || (currentExt === ".jpeg" && actualExt === ".jpg")) return f;

    // 확장자 불일치! 원본 파일을 올바른 확장자로 복사 (원본 유지 + 올바른 파일 생성)
    var newName = dotIdx >= 0 ? currentName.slice(0, dotIdx) + actualExt : currentName + actualExt;
    var newPath = new File(f.parent.fsName + "/" + newName);
    if (!newPath.exists) {
        f.copy(newPath);
    }
    return newPath;
}

// ★ 이미지를 안전하게 임포트 (항상 포맷 감지 먼저 → PNGIO 에러 방지)
function safeImportImage(filePath) {
    // AE의 PNGIO 에러는 try-catch로 잡을 수 없음 (모달 다이얼로그가 먼저 뜸)
    // 따라서 항상 먼저 포맷을 확인하고 확장자를 맞춘 후 임포트
    var fixed = detectAndFixImageFile(filePath);
    var opts = new ImportOptions(fixed);
    return app.project.importFile(opts);
}

// ============================================================
// [0.5] DUIK-Style 본 리깅 시스템
// ============================================================

// DUIK 설치 여부 감지 + API 로드
var DUIK_LOADED = false;
var DUIK_API_PATH = null;

function detectAndLoadDUIK() {
    try {
        // ScriptUI Panels 폴더에서 DUIK API 파일 검색
        var searchPaths = [
            app.path.toString() + "/Scripts/ScriptUI Panels",
            app.path.toString() + "/Scripts"
        ];

        // 모든 후보 경로 수집 (하위 폴더 우선 — libs/ 폴더가 같이 있어야 하므로)
        var candidates = [];

        for (var si = 0; si < searchPaths.length; si++) {
            var folder = new Folder(searchPaths[si]);
            if (!folder.exists) continue;

            // 하위 폴더 먼저 검색 (Duik_API_17.x.x 폴더 안의 API가 libs/와 함께 있어 정상 동작)
            var subFolders = folder.getFiles();
            for (var sfi = 0; sfi < subFolders.length; sfi++) {
                if (!(subFolders[sfi] instanceof Folder)) continue;
                var sub = subFolders[sfi];

                var subFiles = sub.getFiles("*Duik*api*.jsxinc");
                for (var sf = 0; sf < subFiles.length; sf++) candidates.push(subFiles[sf].fsName);

                subFiles = sub.getFiles("*DuAEF*api*.jsxinc");
                for (var sf2 = 0; sf2 < subFiles.length; sf2++) candidates.push(subFiles[sf2].fsName);

                var subExact = new File(sub.fsName + "/Duik_api.jsxinc");
                if (subExact.exists) candidates.push(subExact.fsName);
            }

            // 현재 폴더에서 검색 (단독 파일은 후순위 — libs/ 없으면 로드 실패할 수 있음)
            var files = folder.getFiles("*Duik*api*.jsxinc");
            for (var f = 0; f < files.length; f++) candidates.push(files[f].fsName);

            files = folder.getFiles("*DuAEF*api*.jsxinc");
            for (var f2 = 0; f2 < files.length; f2++) candidates.push(files[f2].fsName);

            var exact = new File(searchPaths[si] + "/Duik_api.jsxinc");
            if (exact.exists) candidates.push(exact.fsName);
            exact = new File(searchPaths[si] + "/DuAEF_Duik_api.jsxinc");
            if (exact.exists) candidates.push(exact.fsName);
        }

        if (candidates.length === 0) return false;

        // 각 후보를 시도 — 로드 성공하면 사용
        for (var ci = 0; ci < candidates.length; ci++) {
            try {
                DUIK_API_PATH = candidates[ci];
                $.evalFile(new File(DUIK_API_PATH));

                if (typeof DuAEF !== "undefined") {
                    DuAEF.init("AE_Auto_Pipeline", "1.0", "AEAutoPipeline");
                    DuAEF.enterRunTime();
                    DUIK_LOADED = true;
                    return true;
                }
                if (typeof Duik !== "undefined") {
                    DUIK_LOADED = true;
                    return true;
                }
            } catch (loadErr) {
                // 이 후보 실패 → 다음 후보 시도
                DUIK_API_PATH = null;
            }
        }

        DUIK_LOADED = false;
        return false;
    } catch (e) {
        return false;
    }
}

// 본 계층 구조 정의
var BONE_HIERARCHY = {
    "hips":       { parent: null,    color: [1, 0.5, 0] },
    "torso":      { parent: "hips",  color: [0, 0.8, 0] },
    "chest":      { parent: "torso", color: [0, 0.8, 0.3] },
    "neck":       { parent: "chest", color: [0.2, 0.6, 1] },
    "head":       { parent: "neck",  color: [1, 0, 0] },
    "left_arm":   { parent: "chest", color: [1, 1, 0] },
    "right_arm":  { parent: "chest", color: [1, 1, 0] },
    "left_hand":  { parent: "left_arm",  color: [1, 0.8, 0] },
    "right_hand": { parent: "right_arm", color: [1, 0.8, 0] },
    "left_leg":   { parent: "hips",  color: [0.5, 0, 1] },
    "right_leg":  { parent: "hips",  color: [0.5, 0, 1] },
    "tail":       { parent: "hips",  color: [0.8, 0.2, 0.8] },
    "hair":       { parent: "head",  color: [0.9, 0.4, 0.1] },
    "accessory":  { parent: "torso", color: [0.5, 0.5, 0.5] }
};

// 본 Null 레이어 생성
function createBoneNull(comp, name, position, color) {
    var bone = comp.layers.addNull();
    bone.name = "BONE_" + name;
    bone.property("Position").setValue(position);
    bone.property("Anchor Point").setValue([50, 50]); // Null 기본 앵커포인트
    // 작게 표시 + 색상으로 구분
    bone.property("Scale").setValue([6, 6]);
    bone.property("Opacity").setValue(40);
    bone.guideLayer = true; // 렌더링에서 제외
    // 라벨 색상 설정 (1-16)
    if (color) {
        // 빨강 계열 = 1, 노랑 = 3, 초록 = 4, 파랑 = 9
        if (color[0] > 0.7 && color[1] < 0.3) bone.label = 1; // 빨강
        else if (color[0] > 0.7 && color[1] > 0.7) bone.label = 3; // 노랑
        else if (color[1] > 0.6) bone.label = 4; // 초록
        else if (color[2] > 0.6) bone.label = 9; // 파랑
        else bone.label = 6; // 보라
    }
    return bone;
}

// 모션별 Expression 생성 (본 레이어용)
function getBoneExpression(motion, amount, speed, phase, parentBoneName) {
    var baseExpr = "";
    var phaseStr = phase.toFixed(4);

    // 부모 본의 움직임을 상속 (계층적 모션)
    var parentInfluence = "";
    if (parentBoneName) {
        parentInfluence =
            "// 부모 본 영향\n" +
            "var parentRot = 0;\n" +
            "try { parentRot = thisComp.layer(\"BONE_" + parentBoneName + "\").rotation * 0.3; } catch(e) {}\n";
    }

    if (motion === "breathe") {
        // 호흡: Y축 미세 사인파 + 스케일 변화
        baseExpr =
            "var amt = " + amount + ";\n" +
            "var spd = " + speed + ";\n" +
            "var ph = " + phaseStr + ";\n" +
            "var breath = Math.sin(time * spd * Math.PI * 2 + ph) * amt;\n" +
            "value + [0, breath]";
    } else if (motion === "nod") {
        // 끄덕임: Rotation 사인파
        baseExpr =
            parentInfluence +
            "var amt = " + amount + ";\n" +
            "var spd = " + speed + ";\n" +
            "var ph = " + phaseStr + ";\n" +
            "Math.sin(time * spd * Math.PI * 2 + ph) * amt + parentRot";
    } else if (motion === "swing") {
        // 흔들기: Rotation + 약간의 position offset
        baseExpr =
            parentInfluence +
            "var amt = " + amount + ";\n" +
            "var spd = " + speed + ";\n" +
            "var ph = " + phaseStr + ";\n" +
            "var swing = Math.sin(time * spd * Math.PI * 2 + ph);\n" +
            "swing * amt + parentRot";
    } else if (motion === "wave") {
        // 물결: 복합 사인파 (자연스러운 물결)
        baseExpr =
            parentInfluence +
            "var amt = " + amount + ";\n" +
            "var spd = " + speed + ";\n" +
            "var ph = " + phaseStr + ";\n" +
            "var wave1 = Math.sin(time * spd * Math.PI * 2 + ph) * amt;\n" +
            "var wave2 = Math.sin(time * spd * 1.7 * Math.PI * 2 + ph + 1.2) * amt * 0.3;\n" +
            "wave1 + wave2 + parentRot";
    } else if (motion === "shake") {
        // 떨림: wiggle
        baseExpr =
            "wiggle(" + Math.max(speed * 5, 3) + ", " + amount + ")";
    } else if (motion === "bob") {
        // 위아래: Position Y 변화
        baseExpr =
            "var amt = " + amount + ";\n" +
            "var spd = " + speed + ";\n" +
            "var ph = " + phaseStr + ";\n" +
            "var bob = Math.sin(time * spd * Math.PI * 2 + ph) * amt;\n" +
            "value + [0, bob]";
    } else {
        // 기본: 사인파 rotation
        baseExpr =
            "var amt = " + amount + ";\n" +
            "var spd = " + speed + ";\n" +
            "var ph = " + phaseStr + ";\n" +
            "Math.sin(time * spd * Math.PI * 2 + ph) * amt";
    }

    return baseExpr;
}

// ★ 2-Bone IK Solver Expression (Dan Ebberts 방식)
// upperLayer와 lowerLayer의 rotation을 effector(컨트롤러) 위치로 자동 계산
function getIKExpression(upperBoneName, lowerBoneName, effectorName, upperLen, lowerLen, isUpper) {
    if (isUpper) {
        return '// 2-Bone IK Solver (upper)\n' +
            'var eff = thisComp.layer("' + effectorName + '");\n' +
            'var goal = eff.position;\n' +
            'var uLen = ' + upperLen + ';\n' +
            'var lLen = ' + lowerLen + ';\n' +
            'var start = position;\n' +
            'var dx = goal[0] - start[0];\n' +
            'var dy = goal[1] - start[1];\n' +
            'var dist = Math.sqrt(dx*dx + dy*dy);\n' +
            'dist = Math.min(dist, uLen + lLen - 1);\n' +
            'var baseAngle = Math.atan2(dy, dx) * 180 / Math.PI;\n' +
            'var cos_a = (uLen*uLen + dist*dist - lLen*lLen) / (2*uLen*dist);\n' +
            'cos_a = Math.max(-1, Math.min(1, cos_a));\n' +
            'var angle = Math.acos(cos_a) * 180 / Math.PI;\n' +
            'baseAngle - angle';
    } else {
        return '// 2-Bone IK Solver (lower)\n' +
            'var upper = thisComp.layer("' + upperBoneName + '");\n' +
            'var eff = thisComp.layer("' + effectorName + '");\n' +
            'var uLen = ' + upperLen + ';\n' +
            'var lLen = ' + lowerLen + ';\n' +
            'var start = upper.position;\n' +
            'var goal = eff.position;\n' +
            'var dx = goal[0] - start[0];\n' +
            'var dy = goal[1] - start[1];\n' +
            'var dist = Math.sqrt(dx*dx + dy*dy);\n' +
            'dist = Math.min(dist, uLen + lLen - 1);\n' +
            'var cos_b = (uLen*uLen + lLen*lLen - dist*dist) / (2*uLen*lLen);\n' +
            'cos_b = Math.max(-1, Math.min(1, cos_b));\n' +
            'var angle = Math.acos(cos_b) * 180 / Math.PI;\n' +
            '180 - angle';
    }
}

// ★ 본 기반 캐릭터 리깅 (DUIK 스타일)
// scaleFactor: 이미지 스케일 비율 (1.0 = 100%, 1.4 = 140% 등) — CC Bend It 좌표 변환용
function rigCharacterWithBones(comp, aeLayer, joints, usePercent, log, errorLog, si, scaleFactor) {
    if (!scaleFactor) scaleFactor = 1.0;
    var boneMap = {}; // name → bone layer
    var maxBends = 6;
    var bendIdx = 0;

    // 1단계: 모든 본 Null 레이어 생성
    for (var ji = 0; ji < joints.length; ji++) {
        var jDef = joints[ji];
        var jPart = jDef.part || jDef.name || "body";
        var rawX = Number(jDef.x) || 50;
        var rawY = Number(jDef.y) || 50;
        var jx = usePercent ? (rawX / 100) * comp.width : rawX;
        var jy = usePercent ? (rawY / 100) * comp.height : rawY;

        var hierDef = BONE_HIERARCHY[jPart] || { parent: null, color: [0.5, 0.5, 0.5] };
        var bone = createBoneNull(comp, jPart, [jx, jy], hierDef.color);
        boneMap[jPart] = bone;
    }

    // 2단계: 부모-자식 계층 설정
    for (var partName in boneMap) {
        if (!boneMap.hasOwnProperty(partName)) continue;
        var hierDef2 = BONE_HIERARCHY[partName];
        if (hierDef2 && hierDef2.parent && boneMap[hierDef2.parent]) {
            try {
                boneMap[partName].setParentWithJump(boneMap[hierDef2.parent]);
            } catch (e) {}
        }
    }

    // 3단계: 각 본에 모션 Expression 적용 + CC Bend It 연동
    for (var ji2 = 0; ji2 < joints.length && bendIdx < maxBends; ji2++) {
        try {
            var jDef2 = joints[ji2];
            var jPart2 = jDef2.part || jDef2.name || "body";
            var jMotion = jDef2.motion || "breathe";
            var jAmount = Number(jDef2.amount) || 10;
            var jSpeed = Number(jDef2.speed) || 0.5;
            var jPhase = (Number(jDef2.phase) || 0) * Math.PI / 180;
            var rawX2 = Number(jDef2.x) || 50;
            var rawY2 = Number(jDef2.y) || 50;
            var jx2 = usePercent ? (rawX2 / 100) * comp.width : rawX2;
            var jy2 = usePercent ? (rawY2 / 100) * comp.height : rawY2;

            // 값 범위 보장
            jAmount = Math.max(jAmount, 5);
            jAmount = Math.min(jAmount, 30);
            jSpeed = Math.max(jSpeed, 0.2);
            jSpeed = Math.min(jSpeed, 2.0);

            // 부모 본 이름 찾기
            var parentPartName = null;
            if (BONE_HIERARCHY[jPart2] && BONE_HIERARCHY[jPart2].parent) {
                parentPartName = BONE_HIERARCHY[jPart2].parent;
                if (!boneMap[parentPartName]) parentPartName = null;
            }

            var bone2 = boneMap[jPart2];
            if (!bone2) continue;

            // 본 레이어에 모션 Expression 적용
            if (jMotion === "breathe" || jMotion === "bob") {
                // Position 기반 모션
                bone2.property("Position").expression =
                    getBoneExpression(jMotion, jAmount, jSpeed, jPhase, null);
            } else {
                // Rotation 기반 모션
                bone2.property("Rotation").expression =
                    getBoneExpression(jMotion, jAmount, jSpeed, jPhase, parentPartName);
            }

            // CC Bend It를 이미지 레이어에 추가하고, 본의 rotation을 참조
            // ★ CC Bend It는 레이어 로컬 좌표에서 동작 → 컴포지션 좌표를 변환 필수!
            var bendEff = aeLayer.property("Effects").addProperty("CC Bend It");
            bendEff.name = "Rig_" + jPart2;

            // 레이어 로컬 좌표로 변환: 컴포지션 좌표를 이미지 원본 좌표로 변환
            var imgW = aeLayer.source.width;
            var imgH = aeLayer.source.height;
            // 퍼센트 좌표는 이미지 크기 기준으로 직접 변환
            var localX = usePercent ? (rawX2 / 100) * imgW : (jx2 / scaleFactor);
            var localY = usePercent ? (rawY2 / 100) * imgH : (jy2 / scaleFactor);

            var bendLen = Math.min(imgW, imgH) * 0.08; // 이미지 크기에 비례
            var isArm = (jPart2.indexOf("arm") >= 0 || jPart2.indexOf("hand") >= 0);
            var isTail = (jPart2.indexOf("tail") >= 0 || jPart2.indexOf("cape") >= 0 || jPart2.indexOf("hair") >= 0);

            if (isArm) {
                bendEff.property("Start").setValue([localX - bendLen, localY]);
                bendEff.property("End").setValue([localX + bendLen, localY]);
            } else if (isTail) {
                bendEff.property("Start").setValue([localX, localY - bendLen * 1.5]);
                bendEff.property("End").setValue([localX, localY + bendLen * 1.5]);
            } else {
                bendEff.property("Start").setValue([localX, localY - bendLen]);
                bendEff.property("End").setValue([localX, localY + bendLen]);
            }

            // ★ CC Bend It의 Bend 값을 본의 Rotation에 연동
            if (jMotion === "breathe" || jMotion === "bob") {
                // 호흡/bob은 본의 Y position 변화를 bend로 변환
                bendEff.property("Bend").expression =
                    "var bone = thisComp.layer(\"BONE_" + jPart2 + "\");\n" +
                    "try {\n" +
                    "  var dy = bone.position[1] - bone.position.valueAtTime(0)[1];\n" +
                    "  dy * 0.5;\n" +
                    "} catch(e) { 0; }";
            } else if (jMotion === "shake") {
                bendEff.property("Bend").expression =
                    "wiggle(" + Math.max(jSpeed * 5, 3) + ", " + jAmount + ")";
            } else {
                // 나머지 모션: 본의 rotation을 직접 bend 값으로 사용
                bendEff.property("Bend").expression =
                    "var bone = thisComp.layer(\"BONE_" + jPart2 + "\");\n" +
                    "try { bone.rotation; } catch(e) { 0; }";
            }

            bendIdx++;
            log.push("    본[" + jPart2 + "]: " + jMotion + " amt:" + jAmount + " spd:" + jSpeed +
                     (parentPartName ? " (부모:" + parentPartName + ")" : "") +
                     " at(" + Math.round(jx2) + "," + Math.round(jy2) + ")");
        } catch (jErr) {
            errorLog.push("씬 " + (si + 1) + " bone[" + ji2 + "]: " + jErr.toString());
        }
    }

    return bendIdx;
}

// ★ DUIK API 기반 캐릭터 리깅 (DUIK 설치 시 자동 사용)
// DUIK의 Bone, IK, FK 기능을 직접 호출하여 고급 리깅 구현
function rigCharacterWithDUIK(comp, aeLayer, joints, usePercent, log, errorLog, si) {
    var boneMap = {}; // part name → bone layer
    var maxBends = 6;
    var bendIdx = 0;

    log.push("    ★ DUIK API 감지 → 고급 리깅 모드 활성화");

    // 1단계: DUIK Bone 생성 (Duik.bone.create 또는 DuAEF 사용)
    for (var ji = 0; ji < joints.length; ji++) {
        var jDef = joints[ji];
        var jPart = jDef.part || jDef.name || "body";
        var rawX = Number(jDef.x) || 50;
        var rawY = Number(jDef.y) || 50;
        var jx = usePercent ? (rawX / 100) * comp.width : rawX;
        var jy = usePercent ? (rawY / 100) * comp.height : rawY;

        try {
            var bone = null;
            // DUIK Angela (Duik 네임스페이스)
            if (typeof Duik !== "undefined" && Duik.bone && typeof Duik.bone.create === "function") {
                bone = Duik.bone.create(comp, [jx, jy]);
                if (bone) bone.name = "DUIK_" + jPart;
            }
            // DuAEF (Bassel 방식)
            else if (typeof DuAEF !== "undefined" && typeof Duik !== "undefined") {
                // DuAEF.Duik.Bone.create 또는 DuAEF 본 생성
                if (Duik.Bone && typeof Duik.Bone.create === "function") {
                    bone = Duik.Bone.create(comp, [jx, jy]);
                    if (bone) bone.name = "DUIK_" + jPart;
                }
            }

            // DUIK API 본 생성 실패 → 일반 Null로 폴백
            if (!bone) {
                var hierDef = BONE_HIERARCHY[jPart] || { parent: null, color: [0.5, 0.5, 0.5] };
                bone = createBoneNull(comp, jPart, [jx, jy], hierDef.color);
            }

            boneMap[jPart] = bone;
        } catch (boneErr) {
            // DUIK 본 생성 실패 → 일반 Null
            var hierDef2 = BONE_HIERARCHY[jPart] || { parent: null, color: [0.5, 0.5, 0.5] };
            boneMap[jPart] = createBoneNull(comp, jPart, [jx, jy], hierDef2.color);
            errorLog.push("씬 " + (si + 1) + " DUIK bone[" + jPart + "] 폴백: " + boneErr.toString());
        }
    }

    // 2단계: 부모-자식 계층 설정
    for (var partName in boneMap) {
        if (!boneMap.hasOwnProperty(partName)) continue;
        var hierDef3 = BONE_HIERARCHY[partName];
        if (hierDef3 && hierDef3.parent && boneMap[hierDef3.parent]) {
            try {
                boneMap[partName].setParentWithJump(boneMap[hierDef3.parent]);
            } catch (e) {}
        }
    }

    // 3단계: IK 체인 설정 (팔, 다리)
    var ikChains = [
        { upper: "left_arm", lower: "left_hand", name: "L_Arm_IK" },
        { upper: "right_arm", lower: "right_hand", name: "R_Arm_IK" },
        { upper: "left_leg", lower: null, name: "L_Leg_IK" },
        { upper: "right_leg", lower: null, name: "R_Leg_IK" }
    ];

    for (var ik = 0; ik < ikChains.length; ik++) {
        var chain = ikChains[ik];
        if (!boneMap[chain.upper]) continue;

        try {
            var hasUpper = boneMap[chain.upper];
            var hasLower = chain.lower ? boneMap[chain.lower] : null;

            // DUIK IK 적용 시도
            var duikIKApplied = false;

            if (typeof Duik !== "undefined") {
                try {
                    // Angela: Duik.ik.twoLayer()
                    if (Duik.ik && typeof Duik.ik.twoLayer === "function" && hasUpper && hasLower) {
                        // 레이어들을 선택해서 IK 적용
                        comp.selection = [];
                        hasUpper.selected = true;
                        hasLower.selected = true;
                        Duik.ik.twoLayer();
                        comp.selection = [];
                        duikIKApplied = true;
                        log.push("    ★ DUIK IK 적용: " + chain.name);
                    }
                    // Bassel: Duik.IK.apply()
                    else if (Duik.IK && typeof Duik.IK.apply === "function" && hasUpper && hasLower) {
                        comp.selection = [];
                        hasUpper.selected = true;
                        hasLower.selected = true;
                        Duik.IK.apply();
                        comp.selection = [];
                        duikIKApplied = true;
                        log.push("    ★ DUIK IK 적용: " + chain.name);
                    }
                } catch (ikApiErr) {
                    // DUIK IK API 호출 실패 → Expression IK 폴백
                }
            }

            // DUIK IK 실패 시 → Expression 기반 2-Bone IK
            if (!duikIKApplied && hasUpper && hasLower) {
                var upperPos = hasUpper.property("Position").value;
                var lowerPos = hasLower.property("Position").value;
                var upperLen = Math.sqrt(
                    Math.pow(lowerPos[0] - upperPos[0], 2) +
                    Math.pow(lowerPos[1] - upperPos[1], 2)
                );
                var lowerLen = upperLen * 0.8;

                // IK 이펙터 (컨트롤러) 생성
                var effector = comp.layers.addNull();
                effector.name = "IK_" + chain.name;
                effector.property("Position").setValue(lowerPos);
                effector.property("Scale").setValue([8, 8]);
                effector.property("Opacity").setValue(60);
                effector.guideLayer = true;
                effector.label = 11; // 청록색

                // 이펙터에 진자운동 Expression 적용
                var jUpper = null;
                var jLower = null;
                for (var fj = 0; fj < joints.length; fj++) {
                    var fPart = joints[fj].part || joints[fj].name;
                    if (fPart === chain.upper) jUpper = joints[fj];
                    if (fPart === chain.lower) jLower = joints[fj];
                }
                if (jLower) {
                    var effSpeed = Number(jLower.speed) || 0.5;
                    var effAmount = Number(jLower.amount) || 15;
                    var effPhase = (Number(jLower.phase) || 0) * Math.PI / 180;
                    effector.property("Position").expression =
                        "var amt = " + effAmount + ";\n" +
                        "var spd = " + effSpeed + ";\n" +
                        "var ph = " + effPhase.toFixed(4) + ";\n" +
                        "var swing = Math.sin(time * spd * Math.PI * 2 + ph) * amt;\n" +
                        "value + [swing * 0.5, swing]";
                }

                // IK Expression 적용
                var upperBoneName = hasUpper.name;
                var lowerBoneName = hasLower.name;
                var effectorLayerName = effector.name;

                hasUpper.property("Rotation").expression =
                    getIKExpression(upperBoneName, lowerBoneName, effectorLayerName, upperLen, lowerLen, true);
                hasLower.property("Rotation").expression =
                    getIKExpression(upperBoneName, lowerBoneName, effectorLayerName, upperLen, lowerLen, false);

                log.push("    ★ Expression IK 적용: " + chain.name + " (2-Bone Solver)");
            }
        } catch (ikErr) {
            errorLog.push("씬 " + (si + 1) + " IK[" + chain.name + "]: " + ikErr.toString());
        }
    }

    // 4단계: FK 체인 설정 (척추: hips→torso→chest→neck→head)
    var fkChain = ["hips", "torso", "chest", "neck", "head"];
    var fkApplied = false;

    try {
        if (typeof Duik !== "undefined") {
            // Angela: Duik.automation.walk 또는 FK
            if (Duik.automation && typeof Duik.automation.fk === "function") {
                var fkBones = [];
                for (var fi = 0; fi < fkChain.length; fi++) {
                    if (boneMap[fkChain[fi]]) fkBones.push(boneMap[fkChain[fi]]);
                }
                if (fkBones.length >= 2) {
                    comp.selection = [];
                    for (var fk = 0; fk < fkBones.length; fk++) {
                        fkBones[fk].selected = true;
                    }
                    Duik.automation.fk();
                    comp.selection = [];
                    fkApplied = true;
                    log.push("    ★ DUIK FK 적용: 척추 체인 (" + fkBones.length + "개 본)");
                }
            }
        }
    } catch (fkErr) {
        // DUIK FK 실패 → Expression 폴백
    }

    // FK 미적용 시 → Expression 기반 FK (기존 방식)
    if (!fkApplied) {
        for (var fki = 0; fki < fkChain.length; fki++) {
            var fkPart = fkChain[fki];
            if (!boneMap[fkPart]) continue;

            var fkJoint = null;
            for (var fji = 0; fji < joints.length; fji++) {
                if ((joints[fji].part || joints[fji].name) === fkPart) {
                    fkJoint = joints[fji]; break;
                }
            }
            if (!fkJoint) continue;

            var fkMotion = fkJoint.motion || "breathe";
            var fkAmount = Math.max(5, Math.min(30, Number(fkJoint.amount) || 8));
            var fkSpeed = Math.max(0.2, Math.min(2.0, Number(fkJoint.speed) || 0.3));
            var fkPhase = (Number(fkJoint.phase) || 0) * Math.PI / 180;

            var parentPartName = null;
            if (BONE_HIERARCHY[fkPart] && BONE_HIERARCHY[fkPart].parent && boneMap[BONE_HIERARCHY[fkPart].parent]) {
                parentPartName = BONE_HIERARCHY[fkPart].parent;
            }

            if (fkMotion === "breathe" || fkMotion === "bob") {
                boneMap[fkPart].property("Position").expression =
                    getBoneExpression(fkMotion, fkAmount, fkSpeed, fkPhase, null);
            } else {
                boneMap[fkPart].property("Rotation").expression =
                    getBoneExpression(fkMotion, fkAmount, fkSpeed, fkPhase, parentPartName);
            }
        }
        log.push("    FK 척추 체인: Expression 기반 적용");
    }

    // 5단계: 남은 본들 (hair, tail, cape 등)에 Expression 적용
    var coveredByIK = {};
    for (var ci = 0; ci < ikChains.length; ci++) {
        coveredByIK[ikChains[ci].upper] = true;
        if (ikChains[ci].lower) coveredByIK[ikChains[ci].lower] = true;
    }
    var coveredByFK = {};
    for (var cf = 0; cf < fkChain.length; cf++) {
        coveredByFK[fkChain[cf]] = true;
    }

    for (var ji2 = 0; ji2 < joints.length; ji2++) {
        var jDef2 = joints[ji2];
        var jPart2 = jDef2.part || jDef2.name || "body";

        // IK/FK에서 이미 처리된 본은 건너뛰기
        if (coveredByIK[jPart2] || coveredByFK[jPart2]) continue;
        if (!boneMap[jPart2]) continue;

        var jMotion = jDef2.motion || "wave";
        var jAmount = Math.max(5, Math.min(30, Number(jDef2.amount) || 10));
        var jSpeed = Math.max(0.2, Math.min(2.0, Number(jDef2.speed) || 0.5));
        var jPhase = (Number(jDef2.phase) || 0) * Math.PI / 180;

        var parentPart = null;
        if (BONE_HIERARCHY[jPart2] && BONE_HIERARCHY[jPart2].parent && boneMap[BONE_HIERARCHY[jPart2].parent]) {
            parentPart = BONE_HIERARCHY[jPart2].parent;
        }

        if (jMotion === "breathe" || jMotion === "bob") {
            boneMap[jPart2].property("Position").expression =
                getBoneExpression(jMotion, jAmount, jSpeed, jPhase, null);
        } else {
            boneMap[jPart2].property("Rotation").expression =
                getBoneExpression(jMotion, jAmount, jSpeed, jPhase, parentPart);
        }
    }

    // 6단계: CC Bend It 연동 (모든 본에 대해) — 레이어 로컬 좌표 사용
    var imgW3 = aeLayer.source.width;
    var imgH3 = aeLayer.source.height;
    for (var ji3 = 0; ji3 < joints.length && bendIdx < maxBends; ji3++) {
        try {
            var jDef3 = joints[ji3];
            var jPart3 = jDef3.part || jDef3.name || "body";
            var jMotion3 = jDef3.motion || "breathe";
            var rawX3 = Number(jDef3.x) || 50;
            var rawY3 = Number(jDef3.y) || 50;
            // ★ 레이어 로컬 좌표로 변환
            var localX3 = usePercent ? (rawX3 / 100) * imgW3 : rawX3;
            var localY3 = usePercent ? (rawY3 / 100) * imgH3 : rawY3;

            if (!boneMap[jPart3]) continue;

            var bendEff = aeLayer.property("Effects").addProperty("CC Bend It");
            bendEff.name = "Rig_" + jPart3;

            var bendLen = Math.min(imgW3, imgH3) * 0.08;
            var isArm = (jPart3.indexOf("arm") >= 0 || jPart3.indexOf("hand") >= 0);
            var isTail = (jPart3.indexOf("tail") >= 0 || jPart3.indexOf("cape") >= 0 || jPart3.indexOf("hair") >= 0);

            if (isArm) {
                bendEff.property("Start").setValue([localX3 - bendLen, localY3]);
                bendEff.property("End").setValue([localX3 + bendLen, localY3]);
            } else if (isTail) {
                bendEff.property("Start").setValue([localX3, localY3 - bendLen * 1.5]);
                bendEff.property("End").setValue([localX3, localY3 + bendLen * 1.5]);
            } else {
                bendEff.property("Start").setValue([localX3, localY3 - bendLen]);
                bendEff.property("End").setValue([localX3, localY3 + bendLen]);
            }

            // CC Bend It의 Bend 값을 본에 연동
            var boneName3 = boneMap[jPart3].name;
            if (jMotion3 === "breathe" || jMotion3 === "bob") {
                bendEff.property("Bend").expression =
                    "var bone = thisComp.layer(\"" + boneName3 + "\");\n" +
                    "try {\n" +
                    "  var dy = bone.position[1] - bone.position.valueAtTime(0)[1];\n" +
                    "  dy * 0.5;\n" +
                    "} catch(e) { 0; }";
            } else if (jMotion3 === "shake") {
                var shakeSpd = Math.max(Number(jDef3.speed || 0.5) * 5, 3);
                var shakeAmt = Number(jDef3.amount) || 10;
                bendEff.property("Bend").expression =
                    "wiggle(" + shakeSpd + ", " + shakeAmt + ")";
            } else {
                bendEff.property("Bend").expression =
                    "var bone = thisComp.layer(\"" + boneName3 + "\");\n" +
                    "try { bone.rotation; } catch(e) { 0; }";
            }

            bendIdx++;
            log.push("    CC Bend It[" + jPart3 + "]: " + boneName3 + " 연동");
        } catch (bendErr) {
            errorLog.push("씬 " + (si + 1) + " DUIK bend[" + ji3 + "]: " + bendErr.toString());
        }
    }

    return bendIdx;
}

// 프로젝트 폴더에서 이미지 파일 찾기 (파일명 불일치 대응)
function findImageFile(projectFolder, fileName) {
    // 1. 정확한 파일명으로 시도
    var exactPath = new File(projectFolder + "/" + fileName);
    if (exactPath.exists) return detectAndFixImageFile(exactPath.fsName);

    // 2. 하위 폴더 포함 검색 (ZIP 해제 시 폴더가 중첩될 수 있음)
    var folder = new Folder(projectFolder);
    var allFiles = folder.getFiles();
    for (var i = 0; i < allFiles.length; i++) {
        if (allFiles[i] instanceof Folder) {
            // 하위 폴더 안에서 찾기
            var subPath = new File(allFiles[i].fsName + "/" + fileName);
            if (subPath.exists) return subPath;
        }
    }

    // 3. 확장자 없는 파일 찾기 (202603251915.jpg → 202603251915)
    var dotIdx = fileName.lastIndexOf(".");
    var baseName = dotIdx >= 0 ? fileName.slice(0, dotIdx) : fileName;
    var noExtPath = new File(projectFolder + "/" + baseName);
    if (noExtPath.exists) return noExtPath;

    // 4. 확장자만 다른 파일 찾기 (character_1.png → character_1.jpg 등)
    var extensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff"];
    for (var ei = 0; ei < extensions.length; ei++) {
        var altPath = new File(projectFolder + "/" + baseName + extensions[ei]);
        if (altPath.exists) return altPath;
    }

    // 5. 파일명에 숫자 인덱스가 있으면 패턴 매칭 (character_1 → image_1 등)
    var numMatch = baseName.match(/(\d+)/);
    if (numMatch) {
        var num = numMatch[1];
        var allInFolder = folder.getFiles("*" + num + ".*");
        for (var fi = 0; fi < allInFolder.length; fi++) {
            if (allInFolder[fi] instanceof File && allInFolder[fi].name.match(/\.(png|jpg|jpeg|webp|gif|bmp|tiff)$/i)) {
                return allInFolder[fi];
            }
        }
    }

    // 6. 못 찾으면 null 반환
    return null;
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
    
    // 이미지 임포트 (PNGIO 오류 시 확장자 수정 후 재시도)
    var footage = safeImportImage(imagePath.fsName);
    
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
        // Lossless(AVI)로 렌더링 → 확장자도 .avi로 변경
        if (!templateApplied) {
            try {
                outputModule.applyTemplate("Lossless");
                templateApplied = true;
                format = "avi"; // ★ Lossless는 AVI 형식 → 확장자 변경 필수
            } catch(e2) {}

            alert(
                "안내: AE 2023 이상 버전에서는 H.264 렌더 템플릿이 제거되었습니다.\n\n" +
                "Lossless(AVI)로 렌더 큐에 추가했습니다.\n\n" +
                "MP4로 출력하려면:\n" +
                "1. 컴포지션 > Adobe Media Encoder에 추가 (Ctrl+Alt+M)\n" +
                "2. Media Encoder에서 H.264 프리셋 선택\n" +
                "3. 렌더링 시작"
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
            format = "avi"; // Lossless = AVI 형식
        } catch(e4) {
            // 기본 템플릿 그대로 사용
        }
    }

    // 출력 경로: 프로젝트 폴더(JSON 위치)에 저장 (OneDrive 바탕화면 문제 방지)
    var outFilename = renderSettings.output_filename || (comp.name + "." + format);
    // 파일명의 확장자가 실제 format과 다르면 교체 (mp4→avi 등)
    if (outFilename.match(/\.mp4$/i) && format === "avi") {
        outFilename = outFilename.replace(/\.mp4$/i, ".avi");
    }
    // 프로젝트 폴더가 있으면 거기에, 없으면 내 문서에 저장
    var outputDir = typeof PROJECT_FOLDER !== "undefined" && PROJECT_FOLDER
        ? PROJECT_FOLDER
        : Folder.myDocuments.fsName;
    var outputPath = new File(outputDir + "/" + outFilename);
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
                var imgPath = findImageFile(projectFolder, imgFileName);
                log.push("  이미지: " + imgFileName);

                if (!imgPath) {
                    errorLog.push("씬 " + (si+1) + " '" + (layerDef.name || layerDef.id) + "': 파일 없음 → " + imgFileName);
                    alert("⚠️ 이미지 파일 없음: " + imgFileName + "\n폴더: " + projectFolder);
                } else {
                    try {
                        log.push("    파일 찾음: " + imgPath.fsName);
                        var footage = safeImportImage(imgPath.fsName);
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
                log.push("  캐릭터 리깅: " + puppetFileName);

                // ★ 강화된 파일 찾기 (확장자 불일치, 하위 폴더 등 대응)
                var puppetPath = findImageFile(projectFolder, puppetFileName);

                if (!puppetPath) {
                    var errMsg = "씬 " + (si+1) + ": 이미지 파일을 찾을 수 없습니다!\n" +
                        "파일명: " + puppetFileName + "\n" +
                        "검색 폴더: " + projectFolder + "\n\n" +
                        "해결 방법:\n" +
                        "1. ZIP 파일을 압축 해제한 폴더에서 JSON을 선택하세요\n" +
                        "2. 이미지 파일이 JSON과 같은 폴더에 있는지 확인하세요";
                    errorLog.push(errMsg);
                    // ★ 즉시 alert로 사용자에게 알림!
                    alert("⚠️ 이미지 파일 없음!\n\n" + errMsg);
                } else {
                    log.push("    파일 찾음: " + puppetPath.fsName);
                    var puppetFootage = safeImportImage(puppetPath.fsName);

                    // ★★★ 2레이어 시스템: 배경(원본, 고정) + 캐릭터(컷아웃, CC Bend It) ★★★
                    var cutoutFile = layerDef.image_source.cutout_file;
                    var cutoutPath = cutoutFile ? findImageFile(projectFolder, cutoutFile) : null;

                    if (cutoutPath) {
                        // 2레이어 모드: 컷아웃이 있으면 사용
                        var cutoutFootage = safeImportImage(cutoutPath.fsName);

                        // 하위: 원본 이미지 (배경, 고정)
                        var bgLayer = comp.layers.add(puppetFootage);
                        bgLayer.name = (layerDef.name || "BG") + "_bg";
                        bgLayer.startTime = currentTime;
                        bgLayer.inPoint = currentTime;
                        bgLayer.outPoint = currentTime + sceneDur;

                        // 상위: 컷아웃 이미지 (캐릭터, CC Bend It 적용)
                        aeLayer = comp.layers.add(cutoutFootage);
                        aeLayer.name = layerDef.name || layerDef.id || ("Rig_" + si + "_" + li);
                        aeLayer.startTime = currentTime;
                        aeLayer.inPoint = currentTime;
                        aeLayer.outPoint = currentTime + sceneDur;

                        // 배경 레이어도 동일한 스케일/위치 적용
                        var bgFitMode = layerDef.image_source.fit_mode || "cover";
                        var bgSrcW = puppetFootage.width, bgSrcH = puppetFootage.height;
                        var bgScale = 100;
                        if (bgSrcW > 0 && bgSrcH > 0) {
                            bgScale = (bgFitMode === "cover")
                                ? Math.max(comp.width / bgSrcW, comp.height / bgSrcH) * 100
                                : Math.min(comp.width / bgSrcW, comp.height / bgSrcH) * 100;
                        }
                        bgLayer.property("Position").setValue([comp.width / 2, comp.height / 2]);
                        bgLayer.property("Scale").setValue([bgScale, bgScale]);
                        bgLayer.property("Opacity").setValue(100);
                        log.push("    2레이어 모드: 배경(고정) + 컷아웃(CC Bend It)");
                    } else {
                        // 1레이어 모드: 원본 이미지에 직접 CC Bend It
                        aeLayer = comp.layers.add(puppetFootage);
                        aeLayer.name = layerDef.name || layerDef.id || ("Rig_" + si + "_" + li);
                        aeLayer.startTime = currentTime;
                        aeLayer.inPoint = currentTime;
                        aeLayer.outPoint = currentTime + sceneDur;
                        log.push("    1레이어 모드: 원본에 직접 CC Bend It");
                    }

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

                    // ★★★ DUIK-Style 본 리깅 시스템 ★★★
                    // 본 계층(Null 레이어) + CC Bend It 연동 = 자연스러운 관절 움직임
                    var joints = layerDef.joints || layerDef.pins || [];

                    // joints가 없거나 비어있으면 → 기본 관절 자동 생성 (퍼센트 좌표)
                    if (joints.length === 0) {
                        joints = [
                            { name: "head", part: "head", x: 50, y: 15, motion: "nod", amount: 10, speed: 0.5, phase: 90 },
                            { name: "torso", part: "torso", x: 50, y: 40, motion: "breathe", amount: 6, speed: 0.3, phase: 0 },
                            { name: "right_arm", part: "right_arm", x: 65, y: 35, motion: "swing", amount: 12, speed: 0.4, phase: 0 },
                            { name: "left_arm", part: "left_arm", x: 35, y: 35, motion: "swing", amount: 12, speed: 0.4, phase: 180 }
                        ];
                        log.push("    ★ joints 없음 → 기본 관절 4개 자동 생성 (본 계층 포함)");
                    }

                    // ★ 좌표가 퍼센트(0~100)인지 픽셀인지 자동 감지
                    var usePercent = true;
                    for (var ci = 0; ci < joints.length; ci++) {
                        var cx = Number(joints[ci].x) || 0;
                        var cy = Number(joints[ci].y) || 0;
                        if (cx > 100 || cy > 100) { usePercent = false; break; }
                    }
                    if (usePercent) {
                        log.push("    ★ 퍼센트 좌표 감지 → 픽셀로 자동 변환");
                    }

                    // ★ DUIK 감지 → 고급 리깅 / 일반 본 리깅 자동 분기
                    var bendIdx = 0;
                    if (detectAndLoadDUIK()) {
                        log.push("    ★ DUIK 설치 감지! → 고급 리깅 모드 (IK/FK 자동 적용)");
                        try {
                            bendIdx = rigCharacterWithDUIK(comp, aeLayer, joints, usePercent, log, errorLog, si);
                        } catch (duikErr) {
                            errorLog.push("씬 " + (si + 1) + " DUIK 리깅 실패 → 기본 본 리깅으로 폴백: " + duikErr.toString());
                            bendIdx = rigCharacterWithBones(comp, aeLayer, joints, usePercent, log, errorLog, si, scaleFactor);
                        }
                    } else {
                        bendIdx = rigCharacterWithBones(comp, aeLayer, joints, usePercent, log, errorLog, si, scaleFactor);
                    }

                    log.push("  → 본 리깅 완료! (본: " + joints.length + "개, CC Bend It: " + bendIdx + "개, " + (DUIK_LOADED ? "DUIK IK/FK" : "계층적 모션") + ")");
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

            // --- 지속 애니메이션 (puppet은 CC Bend It만 사용 → 스킵) ---
            if (aeLayer && layerDef.type === "puppet") {
                // puppet 레이어는 Transform 애니메이션 금지 (이미지 전체 흔들림 방지)
            } else if (aeLayer && layerDef.animation && layerDef.animation.type !== "none") {
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

            // --- Exit 애니메이션 (puppet은 항상 표시 → 스킵) ---
            if (aeLayer && layerDef.type === "puppet") {
                // puppet 레이어는 exit 금지 (opacity 0/scale 0 방지)
            } else if (aeLayer && layerDef.exit && layerDef.exit.type !== "none") {
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

    // ★ 항상 처리 결과 로그 표시 (디버그용)
    var summary = "=== 처리 결과 ===\n";
    summary += "씬: " + data.scenes.length + "개\n";
    summary += "DUIK: " + (DUIK_LOADED ? "✅ 활성 (" + DUIK_API_PATH + ")" : "❌ 미설치 (기본 본 리깅 사용)") + "\n";
    if (errorLog.length > 0) {
        summary += "\n❌ 에러 " + errorLog.length + "개:\n";
        for (var ei = 0; ei < errorLog.length; ei++) {
            summary += "  • " + errorLog[ei] + "\n";
        }
    }
    summary += "\n=== 상세 로그 ===\n";
    for (var li2 = 0; li2 < Math.min(log.length, 40); li2++) {
        summary += log[li2] + "\n";
    }
    if (log.length > 40) summary += "... (" + (log.length - 40) + "개 더)\n";
    alert(summary);
}

// ============================================================
// [MAIN] 메인 실행 함수
// ============================================================
function main() {
    // JSON 파일 선택
    var jsonFile = File.openDialog("스토리보드 JSON 파일을 선택하세요", "JSON Files:*.json");
    if (!jsonFile) return;

    var projectFolder = jsonFile.parent.fsName;
    var PROJECT_FOLDER = projectFolder; // 렌더링 출력 경로용 전역 변수

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
              "해상도: " + comp.width + "x" + comp.height + "\n" +
              "DUIK: " + (DUIK_LOADED ? "활성 (" + DUIK_API_PATH + ")" : "미설치 (기본 본 리깅)") + "\n\n" +
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
