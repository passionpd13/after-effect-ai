# AE Auto Pipeline - 사용 가이드 v1.0

## 개요

스토리보드 이미지를 Claude에게 주면, Claude가 분석하여 JSON을 생성하고,
ExtendScript가 After Effects에서 자동으로 영상을 만들어주는 파이프라인입니다.

---

## 파일 구조

```
ae-pipeline/
├── schema/
│   └── storyboard-schema.json    ← JSON 스키마 정의서 (규칙)
├── scripts/
│   └── ae_auto_pipeline.jsx      ← AE에서 실행할 ExtendScript
├── examples/
│   └── rickshaw_example.json     ← 릭샤 스토리보드 예시 JSON
└── README.md                     ← 이 파일
```

---

## 사용 방법

### Step 1: 스토리보드 + 소스 이미지 준비

하나의 폴더에 아래 파일들을 모아둡니다:

```
my_project/
├── hand_rickshaw.png      ← 소스 이미지 1
├── cycle_rickshaw.png     ← 소스 이미지 2
└── (스토리보드 이미지)     ← Claude에게 보여줄 기획안
```

### Step 2: Claude에게 분석 요청

Claude에게 스토리보드 이미지를 올리고 이렇게 요청합니다:

> "이 스토리보드를 분석해서 AE Auto Pipeline JSON으로 만들어줘.
> 소스 이미지 파일명은 hand_rickshaw.png, cycle_rickshaw.png야."

Claude가 JSON 스키마 규격에 맞는 JSON을 생성합니다.

### Step 3: JSON 파일 저장

Claude가 생성한 JSON을 소스 이미지와 같은 폴더에 저장합니다:

```
my_project/
├── hand_rickshaw.png
├── cycle_rickshaw.png
└── storyboard.json        ← Claude가 생성한 JSON
```

### Step 4: After Effects에서 실행

1. After Effects를 엽니다
2. File > Scripts > Run Script File... 클릭
3. `ae_auto_pipeline.jsx` 파일 선택
4. 파일 선택 대화상자에서 `storyboard.json` 선택
5. 자동으로 컴포지션이 생성됩니다
6. Render Queue에서 렌더링 시작

---

## 지원 기능 목록

### 장면 유형 (Scene Types)
| 유형 | 설명 |
|------|------|
| `image` | 단일 이미지 + 텍스트 |
| `text_only` | 텍스트만 있는 장면 |
| `split_screen` | 화면 분할 비교 |
| `comparison` | 좌우 비교 |

### 애니메이션 (Scene Animations)
| 이름 | 설명 |
|------|------|
| `zoom_in` | 확대 |
| `zoom_out` | 축소 |
| `pan_left/right/up/down` | 이동 |
| `ken_burns` | 확대 + 이동 조합 (다큐멘터리 스타일) |
| `rotate_cw/ccw` | 시계/반시계 회전 |
| `float` | 위아래로 부드럽게 떠다님 |
| `pulse` | 살짝 커졌다 작아졌다 반복 |
| `shake` | 흔들림 효과 |

### 텍스트 애니메이션 (Text Animations)
| 이름 | 설명 |
|------|------|
| `fade_in` | 서서히 나타남 |
| `type_writer` | 타자기처럼 한 글자씩 |
| `slide_up/down` | 위/아래에서 슬라이드 |
| `bounce` | 통통 튀며 등장 |
| `blur_in` | 흐릿하다가 선명해짐 |

### 전환 효과 (Transitions)
| 이름 | 설명 |
|------|------|
| `cut` | 바로 자르기 |
| `fade` | 페이드 아웃 |
| `crossfade` | 크로스페이드 (겹침) |
| `morph` | 변형 전환 (블러 + 스케일 조합) |
| `slide_left/right/up/down` | 밀어내기 |
| `zoom_transition` | 줌인하며 전환 |
| `wipe_left/right/circle` | 와이프 |
| `blur_transition` | 블러 전환 |
| `dissolve` | 디졸브 |

### 이펙트 (Effects)
| 이름 | 설명 |
|------|------|
| `drop_shadow` | 그림자 |
| `glow` | 글로우/발광 |
| `blur` | 가우시안 블러 |
| `vignette` | 비네팅 (가장자리 어둡게) |
| `grain` | 노이즈/그레인 |
| `light_sweep` | 빛 스윕 효과 |
| `lens_flare` | 렌즈 플레어 |
| `color_correction` | 색보정 |

### 강도 (Intensity)
| 레벨 | 변화량 | 사용 상황 |
|-------|--------|-----------|
| `subtle` | 10% | 은은한 움직임, 고급스러운 느낌 |
| `normal` | 20% | 기본값, 대부분의 상황 |
| `strong` | 40% | 강조가 필요한 장면 |

---

## 커스터마이징

### 새 이펙트 추가하기

1. `storyboard-schema.json`의 effects > type > enum에 새 이펙트명 추가
2. `ae_auto_pipeline.jsx`의 `applyEffects()` 함수에 case 추가
3. AE 내장 이펙트명은 `app.effects` 에서 확인 가능

### 새 전환 효과 추가하기

1. 스키마의 transition_to_next > type > enum에 추가
2. `applyTransition()` 함수에 case 추가

---

## 고급: 명령줄 실행 (배치 처리)

After Effects를 명령줄에서 실행하여 여러 영상을 자동으로 만들 수 있습니다:

```bash
# Windows
"C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\afterfx.exe" -r "ae_auto_pipeline.jsx"

# macOS  
/Applications/Adobe\ After\ Effects\ 2024/aerender -project auto_generated.aep -comp "project_name" -output output.mp4
```

### Python에서 자동 실행

```python
import subprocess
import json

# Claude가 생성한 JSON 저장
with open("storyboard.json", "w") as f:
    json.dump(claude_output, f)

# AE 실행
subprocess.run([
    r"C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\afterfx.exe",
    "-r", "ae_auto_pipeline.jsx",
    "-s", "storyboard.json"
])
```

---

## 다음 단계 (로드맵)

### v1.1 (예정)
- [ ] 3D 카메라 움직임 지원
- [ ] 파티클 시스템 통합
- [ ] 프리셋 템플릿 (다큐멘터리, 뉴스, 인포그래픽 등)

### v1.2 (예정)
- [ ] TTS 자동 연동 (Supertone Sona 2)
- [ ] BGM 자동 선택 (장르/분위기 매칭)
- [ ] 자막 자동 생성 및 타이밍 동기화

### v2.0 (예정)
- [ ] Claude Vision으로 스토리보드 자동 파싱
- [ ] 멀티 컴포지션 (인트로/본편/아웃트로 분리)
- [ ] A/B 테스트용 변형 영상 자동 생성
