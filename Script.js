
const connectButton = document.getElementById("connectButton");
const registerButton = document.getElementById("registerButton");
const resetButton = document.getElementById("resetButton");

const sensorStatus = document.getElementById("sensorStatus");
const motionStatus = document.getElementById("motionStatus");
const message = document.getElementById("message");

const currentAngle = document.getElementById("currentAngle");
const registeredAngle = document.getElementById("registeredAngle");
const angleDifference = document.getElementById("angleDifference");

const brightnessValue = document.getElementById("brightnessValue");
const meterFill = document.getElementById("meterFill");
const preview = document.getElementById("preview");
const displayCard = document.getElementById("displayCard");

// 현재 센서 각도와 사용자가 등록한 기준 각도
let current = null;
let reference = null;
let listening = false;

// 화면 내부의 밝기 효과 변경
function setBrightness(value) {
  const brightness = Math.max(25, Math.min(100, value));

  brightnessValue.textContent = `${Math.round(brightness)}%`;
  meterFill.style.width = `${brightness}%`;

  const level = (brightness - 25) / 75;
  const light = Math.round(38 + level * 100);

  preview.style.backgroundColor =
    `rgb(${light}, ${light + 5}, ${light + 10})`;

  preview.style.color =
    brightness >= 65 ? "#ffffff" : "#dce6ec";

  displayCard.style.boxShadow =
    `0 0 ${Math.round(level * 28)}px rgba(245,196,81,${level * 0.3})`;
}

// 두 각도의 차이를 계산할 때 360도 경계를 처리
function angleDelta(a, b) {
  return ((a - b + 180) % 360 + 360) % 360 - 180;
}

// 현재 각도와 등록 각도의 차이에 따라 휘도 결정
function updateBrightness() {
  if (!current || !reference) {
    setBrightness(50);
    motionStatus.textContent = reference
      ? "센서 대기 중"
      : "각도 등록 필요";
    return;
  }

  const betaDifference = angleDelta(current.beta, reference.beta);
  const gammaDifference = angleDelta(current.gamma, reference.gamma);

  // 두 축의 각도 차이를 하나의 값으로 계산
  const difference = Math.hypot(
    betaDifference,
    gammaDifference
  );

  angleDifference.textContent = `${difference.toFixed(1)}°`;

  // 0도 차이일 때 100%, 45도 이상 차이가 나면 25%
  const maxDifference = 45;
  const closeness = Math.max(
    0,
    1 - difference / maxDifference
  );

  const brightness = 25 + 75 * closeness;

  setBrightness(brightness);

  if (difference <= 5) {
    motionStatus.textContent = "최적 시야각";
  } else if (difference < maxDifference) {
    motionStatus.textContent = "등록 각도에 접근 중";
  } else {
    motionStatus.textContent = "등록 각도에서 벗어남";
  }
}

// 센서에서 방향 데이터가 들어올 때마다 실행
function handleOrientation(event) {
  if (
    !Number.isFinite(event.beta) ||
    !Number.isFinite(event.gamma)
  ) {
    sensorStatus.textContent = "유효한 각도 데이터 없음";
    message.textContent =
      "기기에서 방향 센서 데이터를 제공하는지 확인하세요.";
    return;
  }

  current = {
    beta: event.beta,
    gamma: event.gamma
  };

  currentAngle.textContent =
    `β ${current.beta.toFixed(1)}° / γ ${current.gamma.toFixed(1)}°`;

  sensorStatus.textContent = "데이터 수신 중";
  registerButton.disabled = false;

  // 등록된 기준 각도가 있다면 매번 비교
  updateBrightness();
}

// 센서 연결
async function startSensor() {
  if (!("DeviceOrientationEvent" in window)) {
    sensorStatus.textContent = "지원되지 않음";
    message.textContent =
      "이 브라우저는 방향 센서를 지원하지 않습니다.";
    return;
  }

  if (!window.isSecureContext) {
    sensorStatus.textContent = "보안 연결 필요";
    message.textContent =
      "HTTPS 주소로 접속해 센서 연결을 시도하세요.";
    return;
  }

  if (listening) return;

  try {
    // 일부 모바일 브라우저는 사용자의 권한 승인이 필요
    if (
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const permission =
        await DeviceOrientationEvent.requestPermission();

      if (permission !== "granted") {
        sensorStatus.textContent = "권한 거부";
        message.textContent =
          "브라우저의 센서 권한을 허용한 후 다시 시도하세요.";
        return;
      }
    }

    window.addEventListener(
      "deviceorientation",
      handleOrientation
    );

    listening = true;
    connectButton.disabled = true;
    connectButton.textContent = "센서 연결 시도 중";

    sensorStatus.textContent = "센서 대기 중";
    message.textContent =
      "기기의 방향 데이터를 기다리고 있습니다.";

    // 실제 데이터가 도착하지 않는 경우를 확인
    window.setTimeout(() => {
      if (listening && current === null) {
        sensorStatus.textContent = "데이터 미수신";
        message.textContent =
          "기기에 센서가 없거나 브라우저에서 데이터를 " +
          "제공하지 않을 수 있습니다.";
        connectButton.disabled = false;
        connectButton.textContent = "센서 연결 다시 시도";
      }
    }, 5000);

  } catch (error) {
    sensorStatus.textContent = "연결 실패";
    message.textContent =
      `센서 연결 오류: ${error.message}`;
    connectButton.disabled = false;
  }
}

// 현재 자세를 사용자의 최적 시야각으로 등록
function registerAngle() {
  if (!current) {
    message.textContent =
      "먼저 센서 데이터를 받아야 각도를 등록할 수 있습니다.";
    return;
  }

  reference = {
    beta: current.beta,
    gamma: current.gamma
  };

  registeredAngle.textContent =
    `β ${reference.beta.toFixed(1)}° / γ ${reference.gamma.toFixed(1)}°`;

  message.textContent =
    "현재 자세를 기준 각도로 등록했습니다. " +
    "기기를 기울여 휘도 변화를 확인하세요.";

  updateBrightness();
}

// 등록된 각도를 삭제
function resetRegistration() {
  reference = null;

  registeredAngle.textContent = "등록 전";
  angleDifference.textContent = "-";

  setBrightness(50);
  motionStatus.textContent = "각도 등록 필요";

  message.textContent =
    "등록 각도를 초기화했습니다. 다시 각도를 등록할 수 있습니다.";
}

// 버튼 이벤트 연결
connectButton.addEventListener("click", startSensor);
registerButton.addEventListener("click", registerAngle);
resetButton.addEventListener("click", resetRegistration);

// 초기 화면
setBrightness(50);
registerButton.disabled = true;
