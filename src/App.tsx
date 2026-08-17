import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Mic,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  CheckCircle,
  LogOut,
  AlertTriangle,
  UploadCloud,
  Home,
  User,
  Check,
  Award,
  Lock,
  Sparkles,
  ArrowRight,
  Square,
  VolumeX,
  History
} from "lucide-react";
import { STUDENTS, UNITS } from "./data";
import { Student, Unit, Dialogue, SavedProgress, HardRecord, PassRecord } from "./types";
import {
  db,
  storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  collection,
  addDoc,
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from "./firebase";

// 브라우저 SpeechRecognition 호환 선언
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// ── 마감일 설정 (null 이면 무제한) ──
const DEADLINE: Date | null = null; 

export default function App() {
  // ── Authentication States ──
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [loginName, setLoginName] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [deadlineMessage, setDeadlineMessage] = useState("");

  // ── Kakao Detection State ──
  const [isKakao, setIsKakao] = useState(false);

  // ── Unit selection ──
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null);
  const [doneUnits, setDoneUnits] = useState<Record<string, boolean>>({});

  // ── Resume Modal States ──
  const [resumeData, setResumeData] = useState<{ done: number[]; next: number } | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // ── Practice Screen States ──
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0); // 0 ~ N-1 (문장), N (전체대화 녹음)
  const [doneDialogues, setDoneDialogues] = useState<Set<number>>(new Set());
  const [completedDialoguesList, setCompletedDialoguesList] = useState<number[]>([]);

  // ── Practice Control States ──
  const [hasListened, setHasListened] = useState(false);
  const [isListeningStt, setIsListeningStt] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "idle" | "ok" | "ng" | "system-next";
    emoji: string;
    msg: string;
    det: string;
  }>({ status: "idle", emoji: "", msg: "", det: "" });
  const [tryCount, setTryCount] = useState(0);

  // ── Logging & Records ──
  const [hardWords, setHardWords] = useState<HardRecord[]>([]);
  const [passLog, setPassLog] = useState<PassRecord[]>([]);

  // ── Recording States (Full dialogue) ──
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [hasAudio, setHasAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Complete Screen State ──
  const [showComplete, setShowComplete] = useState(false);
  const [completeMeta, setCompleteMeta] = useState("");

  // ── Global App States ──
  const [toastMessage, setToastMessage] = useState("");
  const [currentScreen, setCurrentScreen] = useState<"login" | "units" | "practice" | "complete">("login");

  // ── Refs for Audio & STT ──
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement>(new Audio());
  const recordingTimerRef = useRef<any>(null);
  const sttTimeoutRef = useRef<any>(null);
  const isSttTimedOutRef = useRef<boolean>(false);

  // ── 1. Init: Browser & Storage check ──
  useEffect(() => {
    // Kakao톡 브라우저 감지
    if (/kakaotalk|kakao/i.test(navigator.userAgent)) {
      setIsKakao(true);
    }

    // 로컬스토리지 복구
    const savedDone = localStorage.getItem("pj_done");
    if (savedDone) {
      try {
        setDoneUnits(JSON.parse(savedDone));
      } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
      }
    }

    // 음성합성 사전 로딩 지원
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // ── 2. Toast Controller ──
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 2800);
  };

  // ── 3. Kakao Open External Browser ──
  const openExternalBrowser = () => {
    const url = window.location.href;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      window.location.href = url;
    } else {
      window.location.href =
        "intent://" +
        url.replace(/^https?:\/\//, "") +
        "#Intent;scheme=https;package=com.android.chrome;end";
    }
  };

  // ── 4. Login Function ──
  const handleLogin = () => {
    setLoginError(false);
    const found = STUDENTS.find(
      (s) => s.name === loginName.trim() && s.pw === loginPw.trim()
    );

    if (!found) {
      setLoginError(true);
      setLoginPw("");
      return;
    }

    // 마감 기한 체크 (관리자는 통과)
    if (DEADLINE && found.cls !== "관리자") {
      const now = new Date();
      if (now > DEADLINE) {
        setDeadlineMessage(
          `제출 기간이 만료되었습니다. (마감일: ${DEADLINE.getFullYear()}.${String(
            DEADLINE.getMonth() + 1
          ).padStart(2, "0")}.${String(DEADLINE.getDate()).padStart(
            2,
            "0"
          )}). 선생님께 연락해주세요.`
        );
        return;
      }
    }

    setCurrentUser(found);
    setCurrentScreen("units");
    triggerToast(`반가워요, ${found.name} 학생! 👋`);
  };

  // ── 5. Logout Function ──
  const handleLogout = () => {
    stopSttIfNeeded();
    stopRecordingIfNeeded();
    setCurrentUser(null);
    setLoginName("");
    setLoginPw("");
    setCurrentScreen("login");
  };

  // ── 6. Unit Card Render Helper & Actions ──
  const handleSelectUnit = (unit: Unit) => {
    if (!currentUser) return;
    setActiveUnit(unit);

    // 진행 내역(Resume) 검색
    const progKey = `pjp_${currentUser.name}_${unit.id}`;
    const saved = localStorage.getItem(progKey);

    if (saved) {
      try {
        const parsed: SavedProgress = JSON.parse(saved);
        if (parsed.next > 0 && parsed.next < unit.dialogues.length) {
          setResumeData(parsed);
          setShowResumeModal(true);
          return;
        }
      } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
      }
    }

    // 새로 시작
    setDoneDialogues(new Set());
    setDialogueIndex(0);
    setStepIndex(0);
    setCompletedDialoguesList([]);
    startUnitPractice(unit, 0);
  };

  const startUnitPractice = (unit: Unit, idx: number) => {
    setCurrentScreen("practice");
    setDialogueIndex(idx);
    setStepIndex(0);
    resetSttState();
    resetRecordingState();
  };

  const handleResumeProg = () => {
    if (!activeUnit || !resumeData) return;
    setShowResumeModal(false);
    
    const newSet = new Set<number>(resumeData.done);
    setDoneDialogues(newSet);
    setCompletedDialoguesList(resumeData.done);
    setDialogueIndex(resumeData.next);
    setStepIndex(0);
    setCurrentScreen("practice");
    resetSttState();
    resetRecordingState();
  };

  const handleRestartProg = () => {
    if (!currentUser || !activeUnit) return;
    setShowResumeModal(false);
    
    const progKey = `pjp_${currentUser.name}_${activeUnit.id}`;
    localStorage.removeItem(progKey);

    setDoneDialogues(new Set());
    setCompletedDialoguesList([]);
    setDialogueIndex(0);
    setStepIndex(0);
    setCurrentScreen("practice");
    resetSttState();
    resetRecordingState();
  };

  // ── 7. Progress Save ──
  const saveProgressToLocal = (uid: number, doneArr: number[], next: number) => {
    if (!currentUser) return;
    const progKey = `pjp_${currentUser.name}_${uid}`;
    const data: SavedProgress = { done: doneArr, next };
    localStorage.setItem(progKey, JSON.stringify(data));
  };

  const clearProgressFromLocal = (uid: number) => {
    if (!currentUser) return;
    const progKey = `pjp_${currentUser.name}_${uid}`;
    localStorage.removeItem(progKey);
  };

  // ── 8. STT & Recording Reset Helpers ──
  const resetSttState = () => {
    stopSttIfNeeded();
    setHasListened(false);
    setFeedback({ status: "idle", emoji: "", msg: "", det: "" });
    setTryCount(0);
  };

  const resetRecordingState = () => {
    stopRecordingIfNeeded();
    setHasAudio(false);
    audioPlayerRef.current.src = "";
    audioChunksRef.current = [];
    setRecSeconds(0);
    setUploadProgress(null);
    setIsSubmitting(false);
  };

  const stopSttIfNeeded = () => {
    if (sttTimeoutRef.current) {
      clearTimeout(sttTimeoutRef.current);
      sttTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      setIsListeningStt(false);
    }
  };

  const stopRecordingIfNeeded = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setIsRecording(false);
    }
  };

  // ── 9. Speak TTS Handler ──
  const speakTTS = (text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1.05;

    // 고급 목소리 검색 및 필터링
    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang.startsWith("en") && /samantha/i.test(v.name)) ||
      voices.find((v) => v.lang === "en-US" && !/compact/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (voice) {
      utterance.voice = voice;
    }
    synth.speak(utterance);
    setHasListened(true);
  };

  const speakAllTTS = (lines: string[], currentIdx = 0) => {
    if (currentIdx >= lines.length) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(lines[currentIdx]);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1.05;

    const voices = synth.getVoices();
    const voice =
      voices.find((v) => v.lang.startsWith("en") && /samantha/i.test(v.name)) ||
      voices.find((v) => v.lang === "en-US" && !/compact/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      setTimeout(() => {
        speakAllTTS(lines, currentIdx + 1);
      }, 650);
    };

    synth.speak(utterance);
  };

  // ── 10. Start Speech STT Recognizer ──
  const startSTT = () => {
    if (!hasListened) {
      triggerToast("먼저 🔊 듣기 버튼을 눌러 정확한 소리를 확인해보세요!");
      return;
    }
    if (!activeUnit) return;

    const synth = window.speechSynthesis;
    if (synth) synth.cancel();

    if (!SpeechRecognition) {
      // Browser STT 지원하지않는 경우 우회 완료 처리
      setFeedback({
        status: "ok",
        emoji: "💡",
        msg: "브라우저가 음성 입력을 지원하지 않아요.",
        det: "발음 완료 버튼을 눌러 다음 단계로 통과할 수 있습니다!"
      });
      return;
    }

    stopSttIfNeeded();
    isSttTimedOutRef.current = false;

    const recognizer = new SpeechRecognition();
    recognizer.lang = "en-US";
    recognizer.continuous = false;
    recognizer.interimResults = false;
    recognitionRef.current = recognizer;

    setIsListeningStt(true);
    setFeedback({
      status: "idle",
      emoji: "",
      msg: "",
      det: ""
    });

    const clearSTTTimeout = () => {
      if (sttTimeoutRef.current) {
        clearTimeout(sttTimeoutRef.current);
        sttTimeoutRef.current = null;
      }
    };

    // 6초 타임아웃 감지기 설치 (안드로이드 불통 및 Stuck 현상 하드웨어 조치)
    sttTimeoutRef.current = setTimeout(() => {
      isSttTimedOutRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      setIsListeningStt(false);
      setFeedback({
        status: "ng",
        emoji: "😅",
        msg: "음성 인식 시간이 초과되었습니다.",
        det: "주변을 조용히 하거나 마이크를 다시 누른 뒤 차근차근 큰 목소리로 말해주세요 🎤"
      });
    }, 6000);

    recognizer.onresult = (e: any) => {
      if (isSttTimedOutRef.current) return;
      clearSTTTimeout();
      const spoken = e.results[0][0].transcript.trim();
      setIsListeningStt(false);
      evaluatePronunciation(spoken);
    };

    recognizer.onerror = (e: any) => {
      if (isSttTimedOutRef.current) return;
      clearSTTTimeout();
      setIsListeningStt(false);
      setFeedback({
        status: "ng",
        emoji: "😅",
        msg: "소리가 잘 들리지 않았어요!",
        det: "조금 마이크와 가까이, 또렷하게 다시 말해주세요 🎤"
      });
    };

    recognizer.onend = () => {
      if (isSttTimedOutRef.current) return;
      clearSTTTimeout();
      setIsListeningStt(false);
    };

    try {
      recognizer.start();
    } catch (err) {
      clearSTTTimeout();
      setIsListeningStt(false);
      setFeedback({
        status: "ng",
        emoji: "😅",
        msg: "마이크를 시작할 수 없습니다.",
        det: "마이크 사용 제한을 해제하거나 다른 브라우저(크롬 등)로 접속해 보세요 🎤"
      });
    }
  };

  // ── 11. Core Pronunciation Evaluation Engine ──
  const evaluatePronunciation = (spoken: string) => {
    if (!activeUnit) return;
    const lines = activeUnit.dialogues[dialogueIndex].lines;
    const target = lines[stepIndex];

    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

    const targetWords = normalize(target).split(/\s+/);
    const spokenWords = normalize(spoken).split(/\s+/);

    // 가중치 없는 보조 불용어(채점에서 패스)
    const stopWords = new Set([
      "a", "an", "the", "i", "you", "he", "she", "it", "we", "they",
      "is", "am", "are", "was", "were", "be", "been", "being", "do", "does", "did",
      "to", "of", "in", "on", "at", "for", "and", "or", "but", "so", "my", "your",
      "his", "her", "our", "its", "that", "this", "if", "just", "very", "too"
    ]);

    const filteredTarget = targetWords.filter((w) => !stopWords.has(w));
    const wordsToVerify = filteredTarget.length > 0 ? filteredTarget : targetWords;

    // 히트 매칭 계산
    let hits = 0;
    wordsToVerify.forEach((word) => {
      if (spokenWords.includes(word)) hits++;
    });

    const accuracyScore = hits / wordsToVerify.length;
    const lengthRatio = spokenWords.length / targetWords.length;

    // 합격 여부 (정확도 90% 이상 + 길이율 90% 이상)
    const passed = accuracyScore >= 0.9 && lengthRatio >= 0.9;
    const updatedTries = tryCount + 1;
    setTryCount(updatedTries);

    if (passed) {
      // 합격 처리
      setFeedback({
        status: "ok",
        emoji: "🎉",
        msg: "퍼펙트! 훌륭하고 멋진 발음이에요!",
        det: `"${spoken}"`
      });

      // Pass 로그 추가
      const newPass = {
        dial: dialogueIndex + 1,
        step: stepIndex + 1,
        tries: updatedTries,
        sentence: target
      };
      setPassLog((prev) => [...prev, newPass]);

      // 성공 사운드 피드백 및 자동 다음 단계 전환 트렌지션
      setTimeout(() => {
        handleMarkStepDone();
      }, 1600);
    } else {
      // 불합격 및 재시도 판단
      const missedWords = wordsToVerify.filter((w) => !spokenWords.includes(w)).slice(0, 3);

      if (updatedTries >= 5) {
        // 5회 오답 누적 시 패스 처리
        setFeedback({
          status: "system-next",
          emoji: "📝",
          msg: "선생님이 꼼꼼히 체크해줄게요! 다음으로 가볼까요?",
          det: missedWords.length
            ? `<b>"${missedWords.join(", ")}"</b> 부분을 내일 학원에서 선생님이랑 더 연습해봐요!`
            : "선생님과 함께 다시 소리 내어 고쳐볼게요!"
        });

        // 틀린 기록 추가
        const hardItem: HardRecord = {
          dial: dialogueIndex + 1,
          step: stepIndex + 1,
          sentence: target,
          words: missedWords,
          tries: updatedTries
        };
        setHardWords((prev) => [...prev, hardItem]);

        // 실패 후 강제 로그기록 기록 후 자동 넘어감
        const newPass = {
          dial: dialogueIndex + 1,
          step: stepIndex + 1,
          tries: 5,
          sentence: target
        };
        setPassLog((prev) => [...prev, newPass]);

        setTimeout(() => {
          handleMarkStepDone();
        }, 3000);
      } else {
        // 계속 시도 권유
        setFeedback({
          status: "ng",
          emoji: "✨",
          msg: `${5 - updatedTries}번의 기회가 더 남았어요!`,
          det: missedWords.length
            ? `<b>"${missedWords.join(", ")}"</b> 발음을 다시 듣고 천천히 연습해보세요.`
            : "조금만 더 소리를 크게, 또박또박 말해보세요!"
        });
      }
    }
  };

  // ── 12. Individual Step Finished Action ──
  const handleMarkStepDone = () => {
    if (!activeUnit) return;
    const lines = activeUnit.dialogues[dialogueIndex].lines;

    if (stepIndex < lines.length - 1) {
      setStepIndex((p) => p + 1);
      resetSttState();
    } else {
      // 마지막 핵심 단어 통과 후 -> 전체 대화 녹음 단계로 레벨 업
      setStepIndex(lines.length);
      resetRecordingState();
    }
  };

  // ── 13. Recording (Full Dialogue) Controls ──
  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecordingAndProcess();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // 호환 가능한 마임타입 감지
      const mimes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg",
        "audio/mp4"
      ];
      const usableMime = mimes.find((m) => MediaRecorder.isTypeSupported(m)) || "";

      const recorder = new MediaRecorder(
        stream,
        usableMime ? { mimeType: usableMime } : {}
      );
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioPlayerRef.current.src = URL.createObjectURL(blob);
        setHasAudio(true);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
      setRecSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      triggerToast("마이크 사용 권한 동의가 필요합니다! 🎤");
    }
  };

  const stopRecordingAndProcess = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    mediaRecorderRef.current.stop();
    // 마이크 스트림 트랙 정지해 꺼주기
    mediaRecorderRef.current.stream.getTracks().forEach((track: any) => track.stop());
  };

  const playRecordedAudio = () => {
    if (audioPlayerRef.current.src) {
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.play();
    }
  };

  // ── 14. Full Dialogue Finished & Firebase Upload ──
  const handleMarkFullDone = async () => {
    if (!currentUser || !activeUnit) return;
    setIsSubmitting(true);

    const recordingBlob =
      audioChunksRef.current.length > 0
        ? new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || "audio/webm"
          })
        : null;

    // 1. Firebase Storage 음성파일 등록
    if (recordingBlob) {
      try {
        await uploadRecordingToFirebase(recordingBlob);
      } catch (err) {
        console.error("Audio Upload Failure:", err instanceof Error ? err.message : String(err));
      }
    }

    // 2. 오답/채점 기록 Firebase 업로드
    try {
      await saveSttHistoryToFirebase();
    } catch (err) {
      console.error("History Upload Failure:", err instanceof Error ? err.message : String(err));
    }

    // 전송 완료 후 상태 갱신
    const refreshedDone = new Set<number>(doneDialogues);
    refreshedDone.add(dialogueIndex);
    setDoneDialogues(refreshedDone);

    const nextIdx = getNextUnfinishedIndex(dialogueIndex, refreshedDone);
    const updatedCompletedList = [...completedDialoguesList, dialogueIndex];
    setCompletedDialoguesList(updatedCompletedList);

    saveProgressToLocal(activeUnit.id, updatedCompletedList, nextIdx !== -1 ? nextIdx : 0);

    // 전체 대화 스크립트 도전을 완성했는지 검증
    if (refreshedDone.size >= activeUnit.dialogues.length) {
      // 모든 대화가 끝남 -> 리포트 마무리
      clearProgressFromLocal(activeUnit.id);
      
      const updatedDoneUnits = { ...doneUnits, [activeUnit.id]: true };
      setDoneUnits(updatedDoneUnits);
      localStorage.setItem("pj_done", JSON.stringify(updatedDoneUnits));

      // 연속 학습 카운트 갱신
      const repeatKey = `pj_count_${currentUser.name}_${activeUnit.id}`;
      const prevRepeat = parseInt(localStorage.getItem(repeatKey) || "0");
      localStorage.setItem(repeatKey, String(prevRepeat + 1));

      triggerFinishScreen(prevRepeat + 1);
    } else {
      triggerToast(`멋져요! #${dialogueIndex + 1} 대화 완료! 다음으로 가봐요 👍`);
      if (nextIdx !== -1) {
        setDialogueIndex(nextIdx);
        setStepIndex(0);
        resetSttState();
        resetRecordingState();
      }
    }
  };

  // Firestore & Storage 실 데이터 이송 헬퍼들
  const uploadRecordingToFirebase = async (blob: Blob) => {
    if (!currentUser || !activeUnit) return;
    const mime = blob.type || "audio/webm";
    const ext = mime.includes("webm")
      ? "webm"
      : mime.includes("mp4")
      ? "mp4"
      : "ogg";

    const now = new Date();
    const dateStr =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");

    const cleanUnitName = activeUnit.name.replace(/\//g, "-");
    const nameFormat = `${currentUser.name}_${cleanUnitName}_D${
      dialogueIndex + 1
    }_${dateStr}.${ext}`;
    const storagePath = `recordings/${currentUser.name}/${cleanUnitName}/${nameFormat}`;

    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, blob);

    setUploadProgress(0);

    return new Promise<void>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setUploadProgress(progress);
        },
        (error) => {
          handleFirestoreError(error, OperationType.WRITE, storagePath);
          setUploadProgress(null);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            // 메타데이터 수집 Firestore 전송
            const submissionsPath = "submissions";
            await addDoc(collection(db, submissionsPath), {
              studentName: currentUser.name,
              unitId: activeUnit.id,
              unitName: activeUnit.name,
              dialogueNum: dialogueIndex + 1,
              fileName: nameFormat,
              fileUrl: downloadUrl,
              submittedAt: serverTimestamp()
            });
          } catch (e) {
            console.error("DB Metadata insert error:", e instanceof Error ? e.message : String(e));
          }
          setUploadProgress(null);
          resolve();
        }
      );
    });
  };

  const saveSttHistoryToFirebase = async () => {
    if (!currentUser || !activeUnit) return;

    // 현재 대화 인덱스에 매칭되는 틀린 단어들과 pass 내역 정리
    const currentHardWords = hardWords.filter((rec) => rec.dial === dialogueIndex + 1);
    const currentPassLogs = passLog.filter((rec) => rec.dial === dialogueIndex + 1);

    if (currentPassLogs.length === 0) return;

    const path = "hardWords";
    try {
      await addDoc(collection(db, path), {
        studentName: currentUser.name,
        unitId: activeUnit.id,
        unitName: activeUnit.name,
        dialogueNum: dialogueIndex + 1,
        hardRecords: currentHardWords,
        passLog: currentPassLogs,
        submittedAt: serverTimestamp()
      });

      // 누적기록 중 반영 완료된 분량 필터링 소거
      setHardWords((prev) => prev.filter((rec) => rec.dial !== dialogueIndex + 1));
      setPassLog((prev) => prev.filter((rec) => rec.dial !== dialogueIndex + 1));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const getNextUnfinishedIndex = (curr: number, doneSet: Set<number>) => {
    if (!activeUnit) return -1;
    const total = activeUnit.dialogues.length;
    for (let i = curr + 1; i < total; i++) {
      if (!doneSet.has(i)) return i;
    }
    for (let i = 0; i < curr; i++) {
      if (!doneSet.has(i)) return i;
    }
    return -1;
  };

  // ── 15. Complete Page Trigger ──
  const triggerFinishScreen = (repeatCount: number) => {
    const now = new Date();
    const dateFormatted = `${now.getFullYear()}.${String(
      now.getMonth() + 1
    ).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

    const label = `${dateFormatted} 완료 ${
      repeatCount > 1 ? `· ${repeatCount}번째 완료 🎖` : ""
    }`;
    setCompleteMeta(label);
    setCurrentScreen("complete");
  };

  // ── 16. Unit List Escape Action ──
  const handleExitPractice = () => {
    const synth = window.speechSynthesis;
    if (synth) synth.cancel();
    stopSttIfNeeded();
    stopRecordingIfNeeded();
    setCurrentScreen("units");
  };

  // 포맷팅에 필요한 화자 태그 선택
  const getSpeakerChar = (idx: number) => {
    const speakerSequence = ["A", "B", "A", "B", "A", "B", "A", "B", "A", "B"];
    return speakerSequence[idx] || "?";
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex flex-col antialiased">
      {/* ── 카카오톡 인앱 브라우저 차단 배너 ── */}
      <AnimatePresence>
        {isKakao && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#FEE500] text-[#3A1D00] sticky top-0 z-50 px-4 py-3 shadow-md"
          >
            <div className="max-w-xl mx-auto flex items-center justify-between gap-3 text-sm font-semibold">
              <div className="flex flex-col">
                <span>📱 카카오톡 인앱 브라우저로 접속 중입니다.</span>
                <span className="text-xs text-[#6B4500] font-normal leading-relaxed mt-0.5">
                  마이크 녹음 기능이나 음성 출력이 원활하지 않을 수 있으니 크롬/사파리로 열어주세요.
                </span>
              </div>
              <button
                onClick={openExternalBrowser}
                className="bg-[#3A1D00] text-[#FEE500] text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap active:opacity-90 hover:opacity-95 transition-all"
              >
                외부앱으로 열기 🌐
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 메인 헤더 (모든 화면 상단 고정) ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 px-4 py-3 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-teal-400 flex items-center justify-center text-white font-bold select-none shadow-sm animate-float">
              ⭐
            </div>
            <div>
              <h1 className="text-base font-extrabold text-[#2F3E46] tracking-tight">
                Point Junior <span className="text-brand-blue">Speaking</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-semibold tracking-wide uppercase">
                Dreamy English Adventure
              </p>
            </div>
          </div>

          <AnimatePresence>
            {currentUser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2"
              >
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-xs font-bold text-gray-700">{currentUser.name} 학생</span>
                  <span className="text-[10px] font-semibold text-brand-purple bg-purple-50 px-1.5 py-0.5 rounded-md">
                    {currentUser.cls}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 cursor-pointer rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                  title="로그아웃"
                >
                  <LogOut size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── 메인 앱 뷰포트 영역 ── */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* 1. 로그인 스크린 */}
          {currentScreen === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="w-full flex flex-col items-center justify-center py-6"
            >
              {deadlineMessage ? (
                <div className="w-full max-w-sm bg-white border border-red-100 p-8 rounded-3xl text-center shadow-md">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                    🔒
                  </div>
                  <h3 className="text-lg font-extrabold text-gray-800 mb-2">지각 제출 불가</h3>
                  <p className="text-sm text-gray-500 leading-relaxed break-keep">{deadlineMessage}</p>
                </div>
              ) : (
                <div className="w-full max-w-sm bg-white border border-gray-100 p-8 sm:p-10 rounded-[32px] shadow-sm flex flex-col">
                  <div className="text-center mb-6">
                    <span className="text-3xl inline-block mb-3 drop-shadow-md select-none">🏫</span>
                    <h2 className="text-xl font-black text-gray-800 tracking-tight">
                      Point Junior Speaking
                    </h2>
                    <p className="text-xs text-gray-400 font-semibold mt-1">
                      이름과 4자리 비밀번호를 입력해주세요
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider ml-1">이름</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">👤</span>
                        <input
                          type="text"
                          value={loginName}
                          onChange={(e) => setLoginName(e.target.value)}
                          placeholder="예: 홍길동"
                          maxLength={10}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const pwInput = document.getElementById("loginPw");
                              pwInput?.focus();
                            }
                          }}
                          className="w-full border-2 border-gray-100 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-gray-700 placeholder-gray-300 focus:outline-hidden focus:border-brand-blue transition-colors bg-gray-50/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider ml-1">비밀번호</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">🔒</span>
                        <input
                          id="loginPw"
                          type="password"
                          value={loginPw}
                          onChange={(e) => setLoginPw(e.target.value)}
                          placeholder="숫자 4자리"
                          maxLength={4}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && loginName && loginPw) {
                              handleLogin();
                            }
                          }}
                          className="w-full border-2 border-gray-100 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-gray-700 placeholder-gray-300 focus:outline-hidden focus:border-brand-blue transition-colors bg-gray-50/50"
                        />
                      </div>
                    </div>

                    {loginError && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-50 border border-red-100 text-red-500 font-bold text-xs p-3.5 rounded-2xl text-center"
                      >
                        😢 이름 또는 비밀번호를 다시 확인해보세요.
                      </motion.div>
                    )}

                    <button
                      onClick={handleLogin}
                      disabled={!loginName || !loginPw}
                      className="w-full bg-gradient-to-r from-brand-blue to-blue-500 hover:from-blue-500 hover:to-brand-blue cursor-pointer text-white text-sm font-bold py-4 rounded-2xl transition-all shadow-md shadow-blue-100 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                    >
                      <span>로그인하기</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>

                  <div className="text-center mt-8 pt-5 border-t border-gray-50">
                    <span className="text-[11px] font-semibold text-gray-300">
                      Point Academy © 2026
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 2. 스크립트 선택 스크린 */}
          {currentScreen === "units" && currentUser && (
            <motion.div
              key="units"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="space-y-6 w-full"
            >
              <div className="mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-blue bg-blue-550/10 text-blue-500 px-2.5 py-1 rounded-full">
                  Script Selection
                </span>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight mt-2.5">
                  오늘의 <span className="text-brand-blue">영어 도전</span>은 무엇인가요?
                </h2>
                <p className="text-xs text-gray-500 font-bold mt-1 inline-flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
                  🎯 {(currentUser.cls === "관리자") ? "관리자 모드: 전체 엑세스" : `${currentUser.cls} ${currentUser.name}의 학습 목록`}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {UNITS.filter(
                  (u) => currentUser.cls === "관리자" || currentUser.unitIds.includes(u.id)
                ).map((u) => {
                  const repeatKey = `pj_count_${currentUser.name}_${u.id}`;
                  const count = parseInt(localStorage.getItem(repeatKey) || "0");
                  const hasDone = doneUnits[u.id];

                  return (
                    <motion.div
                      key={u.id}
                      onClick={() => handleSelectUnit(u)}
                      whileHover={{ y: -3, scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="bg-white border-2 border-gray-100/70 hover:border-brand-blue/30 cursor-pointer rounded-3xl p-5 shadow-xs hover:shadow-lg transition-all relative overflow-hidden flex flex-col justify-between min-h-36"
                    >
                      {hasDone && (
                        <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 border border-emerald-100 font-extrabold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Check size={10} className="stroke-[3]" />
                          <span>완료 {count > 1 ? `· ${count}회` : ""}</span>
                        </div>
                      )}

                      <div className="space-y-1 pt-1">
                        <span className="text-3xl block text-left drop-shadow-xs">{u.emoji}</span>
                        <h3 className="text-lg font-black text-gray-800">{u.name}</h3>
                        <p className="text-xs font-semibold text-gray-400">
                          💬 {u.dialogues.length}개 유용한 일상 대화 세트
                        </p>
                      </div>

                      <div className="flex items-center gap-1 border-t border-gray-50 pt-3 mt-4">
                        <span className="text-[10px] bg-sky-50 text-blue-500 px-2 py-0.5 rounded-md font-extrabold">
                          스피킹 집중 패스
                        </span>
                        {currentUser.cls === "관리자" && (
                          <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md font-bold">
                            관리자용
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* 3. 말하기 / 녹음 진행 스크린 */}
          {currentScreen === "practice" && activeUnit && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-5 w-full flex flex-col"
            >
              {/* 스크롤 탑바 네비 */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleExitPractice}
                  className="bg-white hover:bg-gray-50 cursor-pointer border-2 border-gray-100 rounded-2xl px-4 py-2.5 text-xs font-extrabold text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1.5"
                >
                  <ChevronLeft size={14} className="stroke-[3]" />
                  <span>나가기</span>
                </button>
                <span className="text-xs font-extrabold bg-blue-50 text-brand-blue px-3.5 py-2 rounded-2xl border border-blue-100/50">
                  {activeUnit.name}
                </span>
              </div>

              {/* 디테일 프로그레스 게이지 */}
              <div className="bg-white border-2 border-gray-100/60 rounded-3xl p-4 shadow-xs">
                <div className="flex justify-between items-center text-xs font-bold text-gray-400 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 font-extrabold">대화 진행</span>
                    <span className="text-brand-blue font-black">
                      {dialogueIndex + 1} / {activeUnit.dialogues.length}
                    </span>
                  </div>
                  <span className="text-[#3A1D00] font-black">
                    {Math.round((doneDialogues.size / activeUnit.dialogues.length) * 100)}% 완료
                  </span>
                </div>

                {/* 게이지 바 */}
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(doneDialogues.size / activeUnit.dialogues.length) * 100}%`
                    }}
                    transition={{ duration: 0.4 }}
                    className="h-full bg-gradient-to-r from-brand-blue to-teal-400 rounded-full"
                  />
                </div>

                {/* 닷츠 인디케이터 */}
                <div className="flex gap-1.5 mt-3.5 justify-center flex-wrap">
                  {activeUnit.dialogues.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        doneDialogues.has(i)
                          ? "w-4 bg-brand-mint"
                          : i === dialogueIndex
                          ? "w-8 bg-brand-blue"
                          : "w-2.5 bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* 진행 대화 타이포 카드 */}
              <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm flex flex-col space-y-4 relative overflow-hidden">
                {/* 민트/라벤더 은은한 배경 장식 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/20 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-100/20 blur-3xl rounded-full" />

                <div className="flex items-center justify-between border-b border-gray-50 pb-3 z-10">
                  <span className="text-xs bg-brand-blue/10 text-brand-blue font-black px-3 py-1 rounded-full">
                    #{dialogueIndex + 1} 대화상자
                  </span>
                  <span className="text-xs font-extrabold text-gray-400">
                    {stepIndex === activeUnit.dialogues[dialogueIndex].lines.length
                      ? "전체 대화 녹음하기 🎭"
                      : `${stepIndex + 1} / ${
                          activeUnit.dialogues[dialogueIndex].lines.length
                        } 핵심문장`}
                  </span>
                </div>

                <div className="py-2 z-10">
                  {stepIndex === activeUnit.dialogues[dialogueIndex].lines.length ? (
                    // 전체 대화 전체 복습 모드
                    <div className="space-y-3.5">
                      {activeUnit.dialogues[dialogueIndex].lines.map((line, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-2xl flex items-start gap-3 border ${
                            idx % 2 === 0
                              ? "bg-blue-50/20 border-blue-100/30"
                              : "bg-purple-50/20 border-purple-100/30"
                          }`}
                        >
                          <span
                            className={`font-black text-xs px-2.5 py-1 rounded-lg mt-0.5 ${
                              idx % 2 === 0
                                ? "bg-brand-blue text-white"
                                : "bg-brand-purple text-white"
                            }`}
                          >
                            {getSpeakerChar(idx)}
                          </span>
                          <p className="text-sm font-bold text-gray-700 leading-relaxed text-left flex-1 break-keep">
                            {line}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // 개별 문장 말하기 카드 모드
                    <div className="text-center py-4 space-y-2">
                      <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#B0A898] block">
                        따라 말해보세요
                      </span>
                      <p className="text-lg sm:text-fb-card font-black tracking-tight text-[#2D3748] leading-relaxed break-keep">
                        {activeUnit.dialogues[dialogueIndex].lines[stepIndex]}
                      </p>
                    </div>
                  )}
                </div>

                {/* 제어 컨트롤바: 듣기/다음 */}
                <div className="grid grid-cols-2 gap-3 pt-2 z-10 w-full">
                  <button
                    onClick={() => {
                      const lines = activeUnit.dialogues[dialogueIndex].lines;
                      if (stepIndex === lines.length) {
                        speakAllTTS(lines);
                      } else {
                        speakTTS(lines[stepIndex]);
                      }
                    }}
                    className="bg-sky-50 hover:bg-sky-100/70 border border-sky-100/50 cursor-pointer text-brand-blue hover:text-blue-600 font-extrabold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <Volume2 size={16} />
                    <span>🔊 전체 듣기</span>
                  </button>

                  <button
                    onClick={() => {
                      const lines = activeUnit.dialogues[dialogueIndex].lines;
                      if (stepIndex < lines.length) {
                        setStepIndex((p) => p + 1);
                        resetSttState();
                      }
                    }}
                    disabled={stepIndex === activeUnit.dialogues[dialogueIndex].lines.length}
                    className="bg-white hover:bg-gray-50 border-2 border-gray-100 cursor-pointer text-gray-500 font-extrabold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <span>건너뛰기</span>
                    <ChevronRight size={14} className="stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* 하부 피드백 / STT 말하기 & 업로드 컴포넌트 */}
              <div className="z-10">
                {stepIndex < activeUnit.dialogues[dialogueIndex].lines.length ? (
                  /* ── 개별 말하기 STT 제어 영역 ── */
                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      {feedback.status !== "idle" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`p-4.5 rounded-[24px] border border-solid text-left space-y-2 flex items-start gap-4 shadow-xs ${
                            feedback.status === "ok"
                              ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                              : feedback.status === "ng"
                              ? "bg-rose-50/50 border-rose-100 text-rose-800"
                              : "bg-purple-50/50 border-purple-100 text-purple-800"
                          }`}
                        >
                          <span className="text-3xl select-none leading-none mt-1">
                            {feedback.emoji}
                          </span>
                          <div className="flex-1 space-y-1">
                            <h4 className="text-sm font-black tracking-tight">
                              {feedback.msg}
                            </h4>
                            <p
                              className="text-xs text-gray-500 leading-relaxed font-semibold"
                              dangerouslySetInnerHTML={{ __html: feedback.det }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 정교하게 리디자인된 마이크 녹음기 래퍼 */}
                    <div className="flex flex-col items-center justify-center py-2">
                      <motion.button
                        onClick={isListeningStt ? stopSttIfNeeded : startSTT}
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg outline-hidden ${
                          isListeningStt
                            ? "bg-brand-blue animate-mic-active"
                            : "bg-gradient-to-tr from-brand-blue to-blue-500"
                        }`}
                        whileTap={{ scale: 0.96 }}
                      >
                        <Mic size={32} className={isListeningStt ? "animate-pulse" : ""} />
                      </motion.button>
                      <span className="text-xs text-gray-400 font-bold mt-3">
                        {isListeningStt ? "말씀하세요. 귀 기울이고 있어요 👂" : "마이크를 누르고 소리 내어 말해보세요"}
                      </span>
                    </div>

                    <button
                      onClick={handleMarkStepDone}
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-400 cursor-pointer text-white font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 active:scale-98 transition-all hover:brightness-105"
                    >
                      <CheckCircle size={16} />
                      <span>수동으로 통과하고 완료하기</span>
                    </button>
                  </div>
                ) : (
                  /* ── 전체 대화 녹음 음원 제어 영역 ── */
                  <div className="space-y-4">
                    <div className="bg-white border-2 border-dashed border-gray-100 rounded-3xl p-5 text-center space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-550 border-gray-100/50 pb-3">
                        <span className="text-xs font-black text-rose-500">🎙️ 전체 대화 연속 녹음</span>
                        {isRecording && (
                          <span className="text-xs font-bold text-rose-500 flex items-center gap-1.5 animate-pulse">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                            {String(Math.floor(recSeconds / 60)).padStart(2, "0")}:
                            {String(recSeconds % 60).padStart(2, "0")} Recording
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-2 py-2">
                        <button
                          onClick={handleToggleRecording}
                          className={`flex items-center gap-2 cursor-pointer font-extrabold text-sm px-6 py-4 rounded-2xl transition-all active:scale-98 ${
                            isRecording
                              ? "bg-red-500 text-white shadow-md shadow-red-100 animate-pulse-subtle"
                              : "bg-red-50/70 text-red-600 border border-red-100"
                          }`}
                        >
                          {isRecording ? <Square size={16} /> : <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                          <span>{isRecording ? "녹음 종료하기" : "전체 녹음 시작"}</span>
                        </button>

                        <button
                          onClick={playRecordedAudio}
                          disabled={!hasAudio || isRecording}
                          className="bg-white hover:bg-gray-50 cursor-pointer border-2 border-gray-100 disabled:opacity-30 disabled:pointer-events-none text-gray-600 hover:text-brand-blue font-extrabold text-sm px-5 py-4 rounded-2xl flex items-center gap-2 transition-all active:scale-98"
                        >
                          <Play size={16} />
                          <span>들어보기</span>
                        </button>
                      </div>

                      <p className="text-xs font-semibold text-gray-400">
                        전체 대화를 한 번에 예쁘게 녹음한 뒤 완성해 제출해보세요.
                      </p>
                    </div>

                    {/* 업로드 전송 게이지 상태 */}
                    {uploadProgress !== null && (
                      <div className="bg-white border border-gray-100 p-4 rounded-3xl space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-brand-blue">
                          <span className="flex items-center gap-1.5 animate-pulse">
                            <UploadCloud size={14} />
                            <span>선생님께 숙제 전송하는 중...</span>
                          </span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-blue transition-all duration-100"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleMarkFullDone}
                      disabled={isSubmitting || isRecording}
                      className="w-full bg-gradient-to-r from-brand-purple to-purple-500 hover:from-purple-500 hover:to-brand-purple hover:brightness-105 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black py-4.5 px-6 rounded-2xl shadow-lg shadow-purple-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles size={16} />
                      <span>{isSubmitting ? "비밀 일지 전송 중..." : "🎉 대화 미션 전체 완료!"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 완료 대화 미니 로그 히스토리 레코드 */}
              {completedDialoguesList.length > 0 && (
                <div className="border-t border-gray-100 pt-4 mt-3">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-[#B0A898] flex items-center gap-1.5 mb-2.5">
                    <History size={12} />
                    <span>통과 완료된 대화 세트 ({completedDialoguesList.length}개)</span>
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {completedDialoguesList.map((di, index) => (
                      <div
                        key={index}
                        className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 text-left shadow-xs"
                      >
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center">
                          #{di + 1}
                        </div>
                        <p className="text-xs font-semibold text-gray-500 flex-1 truncate">
                          {activeUnit.dialogues[di].lines[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 4. 완료 스크린 */}
          {currentScreen === "complete" && currentUser && activeUnit && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm mx-auto text-center space-y-6 py-6"
            >
              <div className="bg-white border border-gray-150 p-8 rounded-[40px] shadow-sm flex flex-col items-center space-y-5">
                <div className="w-20 h-20 rounded-3xl bg-amber-50 shadow-inner flex items-center justify-center text-4xl animate-bounce">
                  🏆
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl font-black text-gray-800 tracking-tight">
                    {activeUnit.name} 미션 완료!
                  </h3>
                  <p className="text-sm text-gray-500 font-extrabold mb-1">
                    {currentUser.name} 학생, 끝까지 해냈군요!
                  </p>
                  <span className="text-[10px] text-gray-400 font-bold inline-block bg-gray-50 px-2.5 py-1 rounded-md">
                    {completeMeta}
                  </span>
                </div>

                <div className="bg-gradient-to-r from-brand-blue to-teal-400 text-white p-4.5 rounded-2xl text-xs font-semibold leading-relaxed tracking-wide text-left space-y-1">
                  <strong className="block text-sm font-black mb-1.5">📡 전송 완료 보고</strong>
                  오디오와 발음 학습 현황 지표가 담당 코칭 선생님 앱으로 성실하게 자동 배달되었습니다. 오늘도 수고 많았어요! 🎉
                </div>

                <button
                  onClick={() => {
                    setCurrentScreen("units");
                    setActiveUnit(null);
                  }}
                  className="w-full bg-gray-900 cursor-pointer text-white text-xs font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-98"
                >
                  <Home size={14} />
                  <span>학습 목록으로 돌아가기</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── 이어하기 승인 팝업 (Resume Modal) ── */}
      <AnimatePresence>
        {showResumeModal && resumeData && activeUnit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-6.5 max-w-sm w-full shadow-2xl text-center space-y-4"
            >
              <div className="text-3xl select-none leading-none">📌</div>
              <div>
                <h3 className="text-lg font-black text-gray-800 tracking-tight">이전 학업을 발견했어요!</h3>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed mt-2">
                  #{resumeData.done.length}번째 대화상자까지 완료하셨던 기록이 있습니다.<br />
                  <b>#{resumeData.next + 1} 대화상자</b>부터 흐름을 유지할까요?
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleResumeProg}
                  className="bg-gradient-to-r from-brand-blue to-blue-500 hover:brightness-105 cursor-pointer text-white font-extrabold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-100 active:scale-98"
                >
                  <CheckCircle size={14} />
                  <span>이어서 계속하기</span>
                </button>

                <button
                  onClick={handleRestartProg}
                  className="bg-white hover:bg-gray-50 cursor-pointer border-2 border-gray-100 hover:border-red-150 text-gray-500 hover:text-red-500 font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-98"
                >
                  <RotateCcw size={12} />
                  <span>처음부터 새로 시작하기</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 글로벌 토스트 메시지 ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: "-50%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white font-semibold text-xs px-5 py-3.5 rounded-2xl shadow-xl z-50 pointer-events-none tracking-tight flex items-center gap-2"
          >
            <span>✨ {toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
