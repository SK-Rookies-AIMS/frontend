import { Building2 } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-3 px-6">
      <div className="flex items-center justify-between">
        {/* Company Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AIMS 스마트 팩토리</span>
          </div>
          <span className="text-xs text-muted-foreground">서울특별시 강남구 테헤란로 123</span>
          <span className="text-xs text-muted-foreground">사업자번호: 123-45-67890</span>
        </div>
        
        {/* Copyright */}
        <p className="text-xs text-muted-foreground">
          © 2026 AIMS. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
