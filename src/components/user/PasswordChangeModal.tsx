import { useState } from "react";
import api from "@/api/axios";

interface PasswordChangeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PasswordChangeModal({
  open,
  onClose,
}: PasswordChangeModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {

    console.log("localstorage accessToken:", localStorage.getItem("accessToken"));
    console.log("sessionStorage accessToken:", sessionStorage.getItem("accessToken"));
    console.log(window.location.origin);
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert("모든 값을 입력하세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setLoading(true);

      await api.put("/api/auth/password", {
        oldPassword,
        newPassword,
      });

      alert("비밀번호가 변경되었습니다.");
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "비밀번호 변경 실패";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="w-[420px] rounded-xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">비밀번호 변경</h2>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            placeholder="현재 비밀번호"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
          />

          <input
            type="password"
            placeholder="새 비밀번호"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
          />

          <input
            type="password"
            placeholder="새 비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2"
            disabled={loading}
          >
            취소
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </div>
      </div>
    </div>
  );
}