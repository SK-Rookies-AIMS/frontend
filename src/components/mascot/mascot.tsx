"use client"

import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { useLocation, useNavigate } from "react-router-dom"
import { AlertTriangle, ArrowRight, GripVertical } from "lucide-react"
import type { ManualResponse } from "@/types/manual"
import { getCurrentManual } from "@/api/manualApi"
import { motion, useDragControls } from "framer-motion";

// 라이트 모드용 마스코트 이미지
const MASCOT_IMAGE_LIGHT = "/images/watchy-white.png"

// 다크 모드용 마스코트 이미지
const MASCOT_IMAGE_DARK = "/images/watchy-dark.png"

export function Mascot() {
  // 말풍선 모드: none(숨김) | alert(상황 요약) | detail(상세 조치 안내)
  const [bubbleMode, setBubbleMode] = useState<"none" | "alert" | "detail">("none")
  const { resolvedTheme } = useTheme()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [manual, setManual] = useState<ManualResponse | null>(null)
  const [loadingManual, setLoadingManual] = useState(false)
  const isAuthPage = pathname === "/login" || pathname === "/signup"
  const [event, setEvent] = useState<any>(null)
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();

  // AI 지수가 높은 이벤트가 새로 발생하면 자동으로 상황 알림 말풍선 표시
  useEffect(() => {

    setBubbleMode("alert")   // 먼저 말풍선 열기

    const fetchManual = async () => {

        try {

          setLoadingManual(true)
          const data = await getCurrentManual();

          setEvent(data.event);
          setManual(data.manual);

        } finally {

            setLoadingManual(false)

        }
    }

    fetchManual()

  }, [])

  // 테마에 따른 마스코트 이미지 선택
  const mascotImage = resolvedTheme === "dark" ? MASCOT_IMAGE_DARK : MASCOT_IMAGE_LIGHT

  if (isAuthPage) return null

  // 마스코트 클릭: 알림 -> 상세, 상세 -> 닫기, 없음 -> 기본 인사
  const handleMascotClick = () => {
    if (isDragging) return;
    // 이벤트가 없는 경우
    if (!event) {
      setBubbleMode((prev) => (prev === "alert" ? "none" : "alert"));
      return;
    }

    // 이벤트가 있는 경우
    setBubbleMode((prev) => (prev === "detail" ? "none" : "detail"));
  };

  const goToEvent = () => {
    navigate(`/events`)
  }

  const renderBubbleContent = () => {
    if (loadingManual) {
        return (
            <div className="flex flex-col gap-2">
                <p className="text-sm text-white font-medium">
                    🚧 현재 서비스를 준비 중입니다.
                </p>

                <p className="text-xs text-white/70 leading-relaxed">
                    AI가 제조 이벤트를 분석하고 있습니다.
                    <br />
                    잠시만 기다려 주세요.
                </p>
            </div>
        )
    }
    // 이벤트가 없는 경우 기본 인사
    if (!event) {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-white">
            😊 현재 처리할 이벤트가 없습니다.
          </p>

          <p className="text-xs text-white/70 leading-relaxed">
            모든 설비가 정상적으로 운영되고 있습니다.
            <br />
            새로운 이벤트가 발생하면 바로 알려드릴게요!
          </p>
        </div>
      );
    }

    // 상황 요약 알림
    if (bubbleMode === "alert") {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
            <span className="text-xs font-semibold text-red-500">
              AI 지수 {event.riskScore} · {event.severity}
            </span>
          </div>
          <p className="text-sm text-white leading-relaxed">
            <span className="font-medium">{event.process}</span>에서{" "}
            <span className="font-medium">{event.title}</span> 이벤트가 발생했어요. 가장 먼저 확인이 필요해요!
          </p>
          <p className="text-xs text-white/70 leading-relaxed">
            저를 한 번 더 누르면 조치 방법을 자세히 알려드릴게요.
          </p>
          {manual && (

          <p className="text-xs text-cyan-300 leading-relaxed">

          {manual.summary}

          </p>
          )}
        </div>
      )
    }

    // 상세 조치 안내
    return (
      <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
        <span className="text-xs font-semibold text-destructive">
          AI 조치 매뉴얼
        </span>
      </div>

      {/* AI 요약 */}
      {manual?.summary && (
        <p className="text-sm text-white leading-relaxed">
          {manual.summary}
        </p>
      )}

      {/* 로딩 중 */}
      {loadingManual && (
        <div className="speech-bubble">
          {loadingManual ? (
            <p>🤔 Watchy가 조치 매뉴얼을 분석 중입니다...</p>
          ) : manual ? (
            <p>{manual.summary}</p>
          ) : (
            <p>현재는 분석할 이벤트가 없습니다.</p>
          )}
        </div>
      )}

      {/* AI 조치 순서 */}
      {!loadingManual && manual?.steps && (
        <>
          <p className="text-sm text-white leading-relaxed">
            아래 순서대로 조치해 주세요.
          </p>

          <ol className="flex flex-col gap-1.5 text-xs text-white/90 leading-relaxed list-decimal pl-4">
            {manual.steps.map((step, index) => (
                <li key={index}>
                    {step.action}
                </li>
            ))}
          </ol>
        </>
      )}

      {/* AI 주의사항 */}
      {!loadingManual &&
        manual?.precautions &&
        manual.precautions.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-yellow-300 mb-1">
              ⚠ 주의사항
            </p>

            <ul className="list-disc pl-4 text-xs text-white/80 space-y-1">
              {manual.precautions.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

      <button
        onClick={goToEvent}
        className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors px-3 py-2 text-xs font-medium text-white"
      >
        이벤트 페이지로 이동
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
    )
  }

  return (
    <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => {
            setTimeout(() => setIsDragging(false), 100);
        }}
        className="fixed bottom-4 right-4 z-50 flex items-end gap-2"
    >
      {/* Speech Bubble - 캐릭터 좌측에 표시 */}
      {bubbleMode !== "none" && (
        <div className="bg-[#1a4a5e] rounded-2xl px-4 py-3 max-w-[260px] shadow-lg relative animate-in fade-in slide-in-from-right-2 duration-200 mb-8">
          {/* 말풍선 꼬리 - 우측으로 향하게 */}
          <div className="absolute top-1/2 -right-2 w-4 h-4 bg-[#1a4a5e] transform rotate-45 -translate-y-1/2"></div>
          {renderBubbleContent()}
        </div>
      )}

      {/* Mascot Image */}
      <div
        className="cursor-pointer transition-transform hover:scale-105 active:scale-95 flex-shrink-0 relative"
        onPointerDown={(e) => dragControls.start(e)}
        onClick={handleMascotClick}
      >
        {/* 이동 핸들 */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          dragControls.start(e);
        }}
        className="
          absolute
          -top-2
          left-2
          z-20
          w-7
          h-7
          rounded-full
          bg-slate-700/90
          hover:bg-slate-600
          flex
          items-center
          justify-center
          cursor-move
          shadow-md
        "
      >
        <GripVertical className="w-4 h-4 text-white" />
      </div>{/* 이동 핸들 */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          dragControls.start(e);
        }}
        className="
          absolute
          -top-2
          left-2
          z-20
          w-7
          h-7
          rounded-full
          bg-slate-700/90
          hover:bg-slate-600
          flex
          items-center
          justify-center
          cursor-move
          shadow-md
        "
      >
        <GripVertical className="w-4 h-4 text-white" />
      </div>
        {/* AI 지수 높은 이벤트 발생 시 알림 배지 */}
        {event?.riskScore && bubbleMode !== "detail" && (
          <span className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive"></span>
          </span>
        )}
        <img
          src={mascotImage}
          alt="watchy"
          width={200}
          height={200}
        />
      </div>
    </motion.div>
  )
}
