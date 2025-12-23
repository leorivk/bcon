# bcon Type Specifications

> Level 1 (Read-only) 타입 정의

## 1. Container Types

### ContainerState

컨테이너의 현재 상태를 나타낸다.

```python
class ContainerState(str, Enum):
    RUNNING = "running"
    EXITED = "exited"
    PAUSED = "paused"
    RESTARTING = "restarting"
    DEAD = "dead"
    CREATED = "created"
    REMOVING = "removing"
```

### ContainerInfo

컨테이너 기본 정보.

```python
class ContainerInfo(BaseModel):
    id: str                      # 컨테이너 ID (short)
    name: str                    # 컨테이너 이름
    image: str                   # 이미지 이름:태그
    state: ContainerState        # 현재 상태
    status: str                  # 상태 상세 (e.g., "Up 2 hours")
    created: datetime            # 생성 시간
    ports: dict[str, str | None] # 포트 매핑 {"80/tcp": "8080"}
    labels: dict[str, str]       # 라벨
```

### ContainerStats

컨테이너 리소스 사용량.

```python
class ContainerStats(BaseModel):
    container_id: str
    container_name: str
    timestamp: datetime
    
    # CPU
    cpu_percent: float           # CPU 사용률 (0-100)
    cpu_count: int               # 할당된 CPU 수
    
    # Memory
    memory_usage_bytes: int      # 현재 메모리 사용량
    memory_limit_bytes: int      # 메모리 제한
    memory_percent: float        # 메모리 사용률 (0-100)
    
    # Network
    network_rx_bytes: int        # 수신 바이트
    network_tx_bytes: int        # 송신 바이트
    
    # Disk
    block_read_bytes: int        # 디스크 읽기
    block_write_bytes: int       # 디스크 쓰기
```

### ContainerLogs

컨테이너 로그.

```python
class LogEntry(BaseModel):
    timestamp: datetime | None   # 로그 타임스탬프 (없을 수 있음)
    stream: Literal["stdout", "stderr"]
    message: str

class ContainerLogs(BaseModel):
    container_id: str
    container_name: str
    entries: list[LogEntry]
    tail: int                    # 요청한 라인 수
    since: datetime | None       # 시작 시간 필터
```

---

## 2. Drift Detection Types

### DriftStatus

드리프트 상태.

```python
class DriftStatus(str, Enum):
    SYNCED = "synced"            # 일치
    DRIFTED = "drifted"          # 불일치 발견
    UNKNOWN = "unknown"          # 판단 불가
```

### DriftType

드리프트 유형.

```python
class DriftType(str, Enum):
    NOT_RUNNING = "not_running"          # 실행되어야 하나 중지됨
    EXTRA_CONTAINER = "extra_container"  # Git에 없는 컨테이너
    REPLICA_MISMATCH = "replica_mismatch"# replica 수 불일치
    IMAGE_MISMATCH = "image_mismatch"    # 이미지 버전 불일치
    CONFIG_MISMATCH = "config_mismatch"  # 설정 불일치
    MISSING_SERVICE = "missing_service"  # 서비스 누락
```

### ServiceDrift

개별 서비스의 드리프트 정보.

```python
class ServiceDrift(BaseModel):
    service_name: str
    drift_type: DriftType
    expected: dict[str, Any]     # Compose에서 정의한 값
    actual: dict[str, Any]       # 실제 Docker 상태
    message: str                 # 사람이 읽을 수 있는 설명
```

### DriftReport

전체 드리프트 리포트.

```python
class DriftReport(BaseModel):
    timestamp: datetime
    compose_file: str            # 분석한 Compose 파일 경로
    status: DriftStatus
    differences: list[ServiceDrift]
    untracked: list[ContainerInfo]  # Compose에 없는 컨테이너들
    summary: str                 # 요약 메시지
```

---

## 3. Diagnosis Types

### Severity

진단 심각도.

```python
class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"
```

### SymptomType

증상 유형.

```python
class SymptomType(str, Enum):
    HIGH_CPU = "high_cpu"
    HIGH_MEMORY = "high_memory"
    OOM_KILLED = "oom_killed"
    RESTART_LOOP = "restart_loop"
    EXIT_ERROR = "exit_error"
    NETWORK_ERROR = "network_error"
    DISK_PRESSURE = "disk_pressure"
    SLOW_RESPONSE = "slow_response"
    LOG_ERROR = "log_error"
```

### Symptom

발견된 증상.

```python
class Symptom(BaseModel):
    type: SymptomType
    severity: Severity
    description: str             # 사람이 읽을 수 있는 설명
    evidence: dict[str, Any]     # 근거 데이터
    detected_at: datetime
```

### LikelyCause

추정 원인.

```python
class LikelyCause(BaseModel):
    description: str             # 원인 설명
    confidence: float            # 신뢰도 (0-1)
    evidence: list[str]          # 근거 목록
    related_symptoms: list[SymptomType]
```

### Suggestion

권장 조치.

```python
class SuggestionUrgency(str, Enum):
    IMMEDIATE = "immediate"      # 즉시
    SHORT_TERM = "short_term"    # 단기 (1일 내)
    LONG_TERM = "long_term"      # 장기 (1주 내)

class Suggestion(BaseModel):
    urgency: SuggestionUrgency
    action: str                  # 권장 조치
    rationale: str               # 이유
    
    # Level 2+ 에서 사용 (Level 1에서는 항상 None)
    command: str | None = None   # 실행 명령어 (제안만)
```

### DiagnosisReport

진단 리포트.

```python
class DiagnosisReport(BaseModel):
    container_id: str
    container_name: str
    timestamp: datetime
    
    # 현재 상태 요약
    state: ContainerState
    uptime: timedelta | None
    
    # 분석 결과
    symptoms: list[Symptom]
    likely_causes: list[LikelyCause]
    suggestions: list[Suggestion]
    
    # 요약
    summary: str                 # 한 줄 요약
    detailed_explanation: str   # 상세 설명
```

---

## 4. Cost Tracking Types

### TokenUsage

토큰 사용량.

```python
class TokenUsage(BaseModel):
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_usd: float
```

### CostEntry

개별 비용 항목.

```python
class CostEntry(BaseModel):
    timestamp: datetime
    operation: str               # 수행한 작업 (e.g., "diagnose")
    usage: TokenUsage
    cached: bool                 # 캐시 히트 여부
```

### CostReport

비용 리포트.

```python
class CostReport(BaseModel):
    period_start: datetime
    period_end: datetime
    
    total_cost_usd: float
    total_operations: int
    
    by_operation: dict[str, float]  # 작업별 비용
    entries: list[CostEntry]
    
    cache_hit_rate: float        # 캐시 히트율 (0-1)
    estimated_savings_usd: float # 캐싱으로 절감한 비용
```

---

## 5. Common Types

### BconError

에러 응답.

```python
class ErrorCode(str, Enum):
    DOCKER_CONNECTION_FAILED = "docker_connection_failed"
    CONTAINER_NOT_FOUND = "container_not_found"
    COMPOSE_FILE_NOT_FOUND = "compose_file_not_found"
    COMPOSE_PARSE_ERROR = "compose_parse_error"
    PERMISSION_DENIED = "permission_denied"
    INTERNAL_ERROR = "internal_error"

class BconError(BaseModel):
    code: ErrorCode
    message: str
    details: dict[str, Any] | None = None
```

### HealthCheck

bcon 자체 헬스 체크.

```python
class HealthCheck(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    docker_connected: bool
    docker_version: str | None
    timestamp: datetime
    message: str | None = None
```
