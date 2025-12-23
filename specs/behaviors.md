# bcon Behavior Specifications

> Level 1 동작 규약 및 제약사항

## 1. Core Principles

### 1.1 Read-Only Contract

Level 1의 가장 중요한 규약: **시스템 상태를 절대 변경하지 않는다.**

```python
# 허용되는 Docker API 호출
ALLOWED_DOCKER_OPERATIONS = [
    "containers.list",
    "containers.get",
    "containers.logs",
    "containers.stats",
    "images.list",
    "images.get",
    "networks.list",
    "volumes.list",
]

# 금지되는 Docker API 호출
FORBIDDEN_DOCKER_OPERATIONS = [
    "containers.create",
    "containers.run",
    "container.start",
    "container.stop",
    "container.restart",
    "container.remove",
    "container.kill",
    "container.pause",
    "container.unpause",
    "images.pull",
    "images.push",
    "images.remove",
    "images.build",
    "networks.create",
    "networks.remove",
    "volumes.create",
    "volumes.remove",
]
```

### 1.2 Judgment Before Action

bcon은 **판단**을 제공하지만 **실행**하지 않는다.

```
✅ "메모리가 부족해 보입니다. 증설을 권장합니다."
❌ "메모리를 증설했습니다."

✅ "이 컨테이너를 재시작하면 해결될 수 있습니다."
❌ "컨테이너를 재시작했습니다."
```

### 1.3 Human-Readable Output

모든 출력은 **사람이 이해할 수 있는 언어**로 작성한다.

```python
# ❌ Bad
"cpu_percent: 95.2, memory_percent: 87.3"

# ✅ Good  
"CPU 사용률이 95%로 매우 높습니다. 메모리도 87%를 사용 중이며, 
곧 OOM이 발생할 수 있습니다."
```

---

## 2. Diagnosis Behavior

### 2.1 Symptom Detection

증상 탐지는 다음 임계값을 기준으로 한다:

| Metric | Warning | Error | Critical |
|--------|---------|-------|----------|
| CPU % | > 70% | > 85% | > 95% |
| Memory % | > 75% | > 85% | > 95% |
| Restart Count (1h) | >= 2 | >= 3 | >= 5 |
| Error Log Rate | > 10/min | > 50/min | > 100/min |

### 2.2 Confidence Scoring

원인 추정의 신뢰도 계산:

```python
def calculate_confidence(evidence_count: int, evidence_strength: float) -> float:
    """
    evidence_count: 근거 개수
    evidence_strength: 각 근거의 강도 평균 (0-1)
    
    Returns: 신뢰도 (0-1)
    """
    base = min(evidence_count / 5, 1.0)  # 최대 5개까지 고려
    return base * evidence_strength
```

**신뢰도 표시 규칙:**
- 0.8 이상: "높은 확률로"
- 0.5 - 0.8: "가능성이 있음"
- 0.3 - 0.5: "추정"
- 0.3 미만: 표시하지 않음

### 2.3 Suggestion Ordering

권장 조치는 다음 순서로 정렬:

1. **Urgency**: immediate > short_term > long_term
2. **Impact**: 같은 urgency 내에서는 영향도 순
3. **Effort**: 같은 영향도면 쉬운 것 먼저

---

## 3. Drift Detection Behavior

### 3.1 Matching Rules

Compose 서비스와 Docker 컨테이너 매칭:

```python
def match_container_to_service(container: Container, service: Service) -> bool:
    """
    매칭 우선순위:
    1. container.labels["com.docker.compose.service"] == service.name
    2. container.name.startswith(f"{project_name}-{service.name}")
    3. container.name == service.container_name (if specified)
    """
    pass
```

### 3.2 Config Comparison

설정 비교 시 무시할 항목:

```python
IGNORE_IN_CONFIG_COMPARISON = [
    "container_id",
    "created",
    "hostname",
    "mac_address",
    # 동적으로 할당되는 값들
]
```

### 3.3 Drift Severity

드리프트 유형별 심각도:

| Drift Type | Severity |
|-----------|----------|
| NOT_RUNNING | ERROR |
| MISSING_SERVICE | ERROR |
| IMAGE_MISMATCH | WARNING |
| REPLICA_MISMATCH | WARNING |
| CONFIG_MISMATCH | INFO |
| EXTRA_CONTAINER | INFO |

---

## 4. Error Handling Behavior

### 4.1 Graceful Degradation

일부 기능 실패 시 전체 실패하지 않고 부분 결과 반환:

```python
# diagnose_container 예시
try:
    stats = get_container_stats(container_id)
except StatsNotAvailable:
    stats = None
    warnings.append("Stats not available for stopped container")

# stats 없이도 로그 분석은 계속 진행
```

### 4.2 Error Messages

에러 메시지는 다음을 포함:
1. 무엇이 실패했는지
2. 왜 실패했는지 (추정)
3. 어떻게 해결할 수 있는지

```python
# ❌ Bad
"Connection refused"

# ✅ Good
"Docker 데몬에 연결할 수 없습니다. 
Docker가 실행 중인지 확인하세요: `docker ps`
권한 문제일 경우: `sudo usermod -aG docker $USER`"
```

---

## 5. Output Format Behavior

### 5.1 Summary First

모든 리포트는 **요약을 먼저** 제공한다:

```
[요약] api-server: 메모리 부족 경고 (87% 사용 중)

[상세]
- CPU: 45% (정상)
- Memory: 87% (경고)
...
```

### 5.2 Localization

현재 버전: **한국어 + 영어** 지원

```python
class Language(str, Enum):
    KO = "ko"
    EN = "en"

# 기본값: 시스템 로케일 또는 KO
DEFAULT_LANGUAGE = "ko"
```

### 5.3 Timestamp Format

```python
# 표시용
"2024-12-22 14:30:25 KST"

# 내부 저장
datetime (UTC)
```

---

## 6. Resource Limits

### 6.1 Log Tail Limits

```python
MAX_LOG_TAIL = 1000      # 최대 1000줄
DEFAULT_LOG_TAIL = 100   # 기본 100줄
```

### 6.2 Analysis Limits

```python
MAX_CONTAINERS_IN_DIAGNOSE_ALL = 50  # 한 번에 분석할 최대 컨테이너 수
ANALYSIS_TIMEOUT_SECONDS = 30        # 개별 분석 타임아웃
```

---

## 7. Caching Behavior

### 7.1 Cache Strategy

```python
CACHE_TTL = {
    "container_list": 5,      # 5초
    "container_stats": 10,    # 10초
    "container_logs": 30,     # 30초
    "drift_report": 60,       # 60초
    "diagnosis": 120,         # 2분
}
```

### 7.2 Cache Invalidation

다음 경우 캐시 무효화:
- 명시적 요청 (`force_refresh=True`)
- TTL 만료
- 관련 컨테이너 상태 변경 감지

---

## 8. Security Behavior

### 8.1 Sensitive Data Handling

로그에서 민감 정보 마스킹:

```python
SENSITIVE_PATTERNS = [
    r"password\s*=\s*\S+",
    r"api[_-]?key\s*=\s*\S+",
    r"secret\s*=\s*\S+",
    r"token\s*=\s*\S+",
]

def mask_sensitive(text: str) -> str:
    for pattern in SENSITIVE_PATTERNS:
        text = re.sub(pattern, "[MASKED]", text, flags=re.IGNORECASE)
    return text
```

### 8.2 Path Validation

Compose 파일 경로 검증:

```python
def validate_compose_path(path: str) -> bool:
    """
    - 절대 경로 또는 현재 디렉토리 기준 상대 경로
    - ../ 를 통한 상위 디렉토리 접근 제한 (옵션)
    - 심볼릭 링크 해석 후 검증
    """
    pass
```

---

## 9. Versioning

### 9.1 API Version

```python
BCON_VERSION = "0.1.0"
SPEC_VERSION = "1.0"  # 이 스펙 문서의 버전
```

### 9.2 Compatibility

- Level 1 API는 Level 2, 3에서도 동일하게 동작
- 하위 호환성 유지 (breaking change 시 major version bump)
