# bcon Tool Specifications

> Level 1 (Read-only) Tool 인터페이스 정의

## Overview

모든 Tool은 **read-only**이다. 시스템 상태를 변경하는 작업은 Level 1에서 금지된다.

```
허용: inspect, stats, logs, list, diagnose, detect, explain
금지: create, start, stop, remove, restart, scale, deploy
```

---

## 1. Container Tools

### `list_containers`

실행 중인 컨테이너 목록을 조회한다.

**Input:**
```python
class ListContainersInput(BaseModel):
    all: bool = False            # True면 중지된 컨테이너도 포함
    filters: dict[str, str] | None = None  # 필터 (label, name 등)
```

**Output:**
```python
list[ContainerInfo]
```

**Example:**
```
Input:  {"all": true}
Output: [
    {
        "id": "abc123",
        "name": "api-server",
        "image": "myapp:v2.1",
        "state": "running",
        "status": "Up 2 hours",
        ...
    },
    ...
]
```

---

### `get_container_info`

특정 컨테이너의 상세 정보를 조회한다.

**Input:**
```python
class GetContainerInfoInput(BaseModel):
    container_id: str            # 컨테이너 ID 또는 이름
```

**Output:**
```python
ContainerInfo
```

**Errors:**
- `CONTAINER_NOT_FOUND`: 컨테이너가 존재하지 않음

---

### `get_container_stats`

컨테이너의 리소스 사용량을 조회한다.

**Input:**
```python
class GetContainerStatsInput(BaseModel):
    container_id: str
```

**Output:**
```python
ContainerStats
```

**Errors:**
- `CONTAINER_NOT_FOUND`: 컨테이너가 존재하지 않음

**Note:**
- 실행 중인 컨테이너만 stats 조회 가능
- 중지된 컨테이너는 마지막 알려진 stats 반환 (없으면 에러)

---

### `get_container_logs`

컨테이너 로그를 조회한다.

**Input:**
```python
class GetContainerLogsInput(BaseModel):
    container_id: str
    tail: int = 100              # 마지막 N줄
    since: datetime | None = None  # 이 시간 이후 로그만
    until: datetime | None = None  # 이 시간 이전 로그만
    timestamps: bool = True      # 타임스탬프 포함
```

**Output:**
```python
ContainerLogs
```

**Errors:**
- `CONTAINER_NOT_FOUND`: 컨테이너가 존재하지 않음

---

## 2. Drift Detection Tools

### `detect_drift`

Compose 파일과 실제 Docker 상태 간의 차이를 탐지한다.

**Input:**
```python
class DetectDriftInput(BaseModel):
    compose_file: str            # Compose 파일 경로
    project_name: str | None = None  # 프로젝트 이름 (없으면 파일에서 추론)
```

**Output:**
```python
DriftReport
```

**Errors:**
- `COMPOSE_FILE_NOT_FOUND`: Compose 파일이 존재하지 않음
- `COMPOSE_PARSE_ERROR`: Compose 파일 파싱 실패

**Behavior:**
1. Compose 파일 파싱하여 Desired State 추출
2. Docker API로 Actual State 조회
3. 차이점 분석
4. 사람이 읽을 수 있는 리포트 생성

**Detection Rules:**
| 상황 | Drift Type |
|-----|-----------|
| Compose에 정의된 서비스가 실행 안 됨 | `NOT_RUNNING` |
| 실행 중이나 replica 수 다름 | `REPLICA_MISMATCH` |
| 이미지 태그가 다름 | `IMAGE_MISMATCH` |
| 환경변수/포트 등 설정이 다름 | `CONFIG_MISMATCH` |
| Compose에 없는 컨테이너 존재 | `EXTRA_CONTAINER` |
| Compose에 있으나 컨테이너 없음 | `MISSING_SERVICE` |

---

### `get_untracked_containers`

Compose에 정의되지 않은 실행 중인 컨테이너를 조회한다.

**Input:**
```python
class GetUntrackedContainersInput(BaseModel):
    compose_file: str | None = None  # 없으면 모든 컨테이너가 untracked
    project_name: str | None = None
```

**Output:**
```python
list[ContainerInfo]
```

---

## 3. Diagnosis Tools

### `diagnose_container`

컨테이너 상태를 분석하고 문제를 진단한다. **킬러 피처.**

**Input:**
```python
class DiagnoseContainerInput(BaseModel):
    container_id: str
    include_logs: bool = True    # 로그 분석 포함
    log_tail: int = 200          # 분석할 로그 줄 수
```

**Output:**
```python
DiagnosisReport
```

**Errors:**
- `CONTAINER_NOT_FOUND`: 컨테이너가 존재하지 않음

**Behavior:**
1. 컨테이너 기본 정보 수집
2. 리소스 사용량 분석
3. 로그에서 에러 패턴 탐지
4. 재시작 이력 분석
5. 증상(Symptoms) 도출
6. 추정 원인(Likely Causes) 도출
7. 권장 조치(Suggestions) 생성
8. 사람이 읽을 수 있는 리포트 생성

**Symptom Detection Rules:**
| 조건 | Symptom |
|-----|---------|
| CPU > 80% | `HIGH_CPU` |
| Memory > 85% | `HIGH_MEMORY` |
| OOM 로그 발견 | `OOM_KILLED` |
| 최근 1시간 내 재시작 3회 이상 | `RESTART_LOOP` |
| Exit code != 0 | `EXIT_ERROR` |
| 네트워크 에러 로그 | `NETWORK_ERROR` |
| Error/Exception 로그 패턴 | `LOG_ERROR` |

---

### `explain_error`

특정 에러 메시지나 로그 패턴을 분석하여 설명한다.

**Input:**
```python
class ExplainErrorInput(BaseModel):
    container_id: str
    error_pattern: str           # 검색할 에러 패턴
    context_lines: int = 5       # 전후 컨텍스트 줄 수
```

**Output:**
```python
class ErrorExplanation(BaseModel):
    pattern: str
    occurrences: int             # 발생 횟수
    first_seen: datetime | None
    last_seen: datetime | None
    explanation: str             # 에러 설명
    likely_causes: list[str]     # 추정 원인
    suggestions: list[str]       # 권장 조치
    sample_logs: list[str]       # 샘플 로그 (컨텍스트 포함)
```

---

### `diagnose_all`

모든 컨테이너를 진단하고 요약 리포트를 생성한다.

**Input:**
```python
class DiagnoseAllInput(BaseModel):
    include_healthy: bool = False  # 건강한 컨테이너도 포함
```

**Output:**
```python
class DiagnoseAllReport(BaseModel):
    timestamp: datetime
    total_containers: int
    healthy: int
    warning: int
    error: int
    critical: int
    
    summaries: list[ContainerHealthSummary]
    
class ContainerHealthSummary(BaseModel):
    container_id: str
    container_name: str
    status: Literal["healthy", "warning", "error", "critical"]
    top_issue: str | None        # 가장 심각한 문제 요약
```

---

## 4. Utility Tools

### `health_check`

bcon 자체의 상태를 확인한다.

**Input:**
```python
None
```

**Output:**
```python
HealthCheck
```

---

### `get_cost_report`

API 비용 사용량 리포트를 조회한다.

**Input:**
```python
class GetCostReportInput(BaseModel):
    period: Literal["day", "week", "month"] = "day"
```

**Output:**
```python
CostReport
```

---

## 5. Tool Summary Table

| Tool | 입력 | 출력 | 설명 |
|------|-----|-----|-----|
| `list_containers` | filters, all | `list[ContainerInfo]` | 컨테이너 목록 |
| `get_container_info` | container_id | `ContainerInfo` | 컨테이너 상세 |
| `get_container_stats` | container_id | `ContainerStats` | 리소스 사용량 |
| `get_container_logs` | container_id, tail, since | `ContainerLogs` | 로그 조회 |
| `detect_drift` | compose_file | `DriftReport` | 드리프트 탐지 |
| `get_untracked_containers` | compose_file | `list[ContainerInfo]` | 미추적 컨테이너 |
| `diagnose_container` | container_id | `DiagnosisReport` | 컨테이너 진단 |
| `explain_error` | container_id, pattern | `ErrorExplanation` | 에러 설명 |
| `diagnose_all` | include_healthy | `DiagnoseAllReport` | 전체 진단 |
| `health_check` | - | `HealthCheck` | 헬스 체크 |
| `get_cost_report` | period | `CostReport` | 비용 리포트 |

---

## 6. Error Handling

모든 Tool은 실패 시 `BconError`를 반환한다.

```python
# 성공
{"result": <output>}

# 실패
{"error": {"code": "container_not_found", "message": "...", "details": {...}}}
```

**Error Codes:**
| Code | 설명 |
|------|-----|
| `docker_connection_failed` | Docker 데몬 연결 실패 |
| `container_not_found` | 컨테이너를 찾을 수 없음 |
| `compose_file_not_found` | Compose 파일이 없음 |
| `compose_parse_error` | Compose 파일 파싱 실패 |
| `permission_denied` | 권한 없음 |
| `internal_error` | 내부 오류 |
