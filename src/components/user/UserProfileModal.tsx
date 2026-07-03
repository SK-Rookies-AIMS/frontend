import { useState } from "react";
import PasswordChangeModal from "./PasswordChangeModal";

interface JwtPayload {
  name: string
  email: string
  employeeId: string
  role: string
}

interface UserProfileModalProps {
  open: boolean
  user: {
    sub: string
    role: string
    empNo: number
    id: number
    name: string
    workExperience: number
    iat: number
    exp: number
  } | null
  onClose: () => void
}

export default function UserProfileModal({
  open,
  user,
  onClose,
}: UserProfileModalProps) {

  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  
  if (!open || !user) return null

  return (
    <>
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-[420px] rounded-xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">사용자 정보</h2>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
            <InfoRow label="이름"     value={user.name} />
            <InfoRow label="이메일"   value={user.sub} />
            <InfoRow label="사번"     value={String(user.empNo)} />
            <InfoRow label="역할"     value={user.role} />
            <InfoRow label="근무 경력" value={`${user.workExperience}년차`} />
        </div>

        <div className="mt-6">
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="w-full rounded-lg bg-primary px-4 py-2 text-white hover:opacity-90"
          >
            비밀번호 변경
          </button>
        </div>
      </div>
    </div>

    <PasswordChangeModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="flex justify-between items-center border-b border-border pb-2">
      <span className="text-sm text-muted-foreground">
        {label}
      </span>

      <span className="font-medium">
        {value}
      </span>
    </div>
  )
}