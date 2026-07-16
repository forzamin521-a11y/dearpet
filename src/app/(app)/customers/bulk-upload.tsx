"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, FileUp } from "lucide-react";
import { bulkCreateCustomers, type BulkCustomerRow } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TEMPLATE_HEADERS = [
  "보호자호칭",
  "전화번호",
  "보호자메모",
  "반려동물명",
  "종",
  "품종",
  "몸무게(kg)",
  "생년월일",
  "반려동물메모",
] as const;

const EXAMPLE_ROWS = [
  ["솜이맘", "010-1234-5678", "단골", "솜이", "강아지", "푸들", 4.2, "2021-03-15", "겁이 많아요"],
  ["솜이맘", "010-1234-5678", "", "구름", "고양이", "코숏", 3.8, "2022-07-01", ""],
  ["초코아빠", "010-9876-5432", "", "초코", "강아지", "말티즈", 2.9, "", ""],
];

/** 열 제목으로 컬럼 인덱스 찾기 (공백 제거 후 부분 일치) */
function findCol(headers: string[], ...keywords: string[]): number {
  return headers.findIndex((h) => {
    const t = h.replace(/\s/g, "");
    return keywords.some((k) => t.includes(k));
  });
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  // 엑셀이 숫자 처리하며 앞 0이 사라진 경우 복원
  const full = digits.length === 10 && digits.startsWith("1") ? `0${digits}` : digits;
  if (full.length === 11) {
    return `${full.slice(0, 3)}-${full.slice(3, 7)}-${full.slice(7)}`;
  }
  return value.trim();
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

export function BulkUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [parsed, setParsed] = useState<BulkCustomerRow[] | null>(null);

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS], ...EXAMPLE_ROWS]);
    ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length * 2, 12) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "고객목록");
    XLSX.writeFile(wb, "고객_일괄등록_양식.xlsx");
  };

  const parseFile = async (file: File) => {
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      let wb: import("xlsx").WorkBook;
      if (/\.csv$/i.test(file.name)) {
        // CSV는 한글 인코딩(UTF-8/EUC-KR)을 직접 판별해 디코딩
        const bytes = new Uint8Array(buf);
        let text = new TextDecoder("utf-8").decode(bytes);
        if (text.includes("�")) {
          text = new TextDecoder("euc-kr").decode(bytes);
        }
        wb = XLSX.read(text, { type: "string" });
      } else {
        wb = XLSX.read(buf);
      }
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        raw: false,
        defval: "",
      });
      if (aoa.length < 2) {
        toast.error("데이터가 없습니다. 양식을 확인해 주세요.");
        return;
      }

      const headers = aoa[0].map(String);
      const col = {
        name: findCol(headers, "보호자호칭", "보호자", "호칭", "고객명", "이름"),
        phone: findCol(headers, "전화", "연락처", "휴대폰"),
        memo: findCol(headers, "보호자메모", "고객메모"),
        petName: findCol(headers, "반려동물명", "펫이름", "동물명"),
        species: findCol(headers, "종"),
        breed: findCol(headers, "품종", "견종", "묘종"),
        weight: findCol(headers, "몸무게", "체중"),
        birth: findCol(headers, "생년월일", "생일", "출생"),
        petMemo: findCol(headers, "반려동물메모", "펫메모", "동물메모"),
      };
      if (col.name < 0) {
        toast.error("'보호자호칭' 열을 찾을 수 없습니다. 양식을 다운로드해 사용해 주세요.");
        return;
      }

      const get = (row: string[], idx: number) =>
        idx >= 0 ? String(row[idx] ?? "").trim() : "";

      const rows: BulkCustomerRow[] = aoa
        .slice(1)
        .filter((row) => get(row, col.name))
        .map((row) => {
          const weight = parseFloat(get(row, col.weight));
          return {
            name: get(row, col.name),
            phone: normalizePhone(get(row, col.phone)),
            memo: get(row, col.memo),
            petName: get(row, col.petName),
            species: get(row, col.species),
            breed: get(row, col.breed),
            weightKg: isNaN(weight) ? null : weight,
            birthDate: normalizeDate(get(row, col.birth)),
            petMemo: get(row, col.petMemo),
          };
        });

      if (rows.length === 0) {
        toast.error("등록할 행이 없습니다. 보호자호칭이 비어 있지 않은지 확인해 주세요.");
        return;
      }
      setParsed(rows);
    } catch {
      toast.error("파일을 읽지 못했습니다. csv, xls, xlsx 파일인지 확인해 주세요.");
    }
  };

  const confirmUpload = () => {
    if (!parsed) return;
    startTransition(async () => {
      const result = await bulkCreateCustomers(parsed);
      if (result.ok) {
        const skippedMsg =
          result.skipped && result.skipped > 0
            ? ` (이미 등록된 전화번호 ${result.skipped}명 제외)`
            : "";
        toast.success(`${result.inserted}명이 등록되었습니다.${skippedMsg}`);
        setParsed(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  const customerCount = parsed
    ? new Set(parsed.map((r) => `${r.name}|${r.phone.replace(/\D/g, "")}`)).size
    : 0;
  const petCount = parsed ? parsed.filter((r) => r.petName).length : 0;

  return (
    <>
      <Button variant="outline" onClick={downloadTemplate}>
        <Download /> 양식 다운로드
      </Button>
      <Button
        variant="outline"
        onClick={() => fileRef.current?.click()}
      >
        <FileUp /> 일괄 업로드
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) parseFile(file);
          e.target.value = ""; // 같은 파일 재선택 허용
        }}
      />

      <AlertDialog
        open={!!parsed}
        onOpenChange={(open) => !open && setParsed(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>고객 일괄 등록</AlertDialogTitle>
            <AlertDialogDescription>
              고객 {customerCount}명, 반려동물 {petCount}마리를 등록합니다.
              이미 등록된 전화번호와 겹치는 고객은 자동으로 건너뜁니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault(); // 등록 완료까지 다이얼로그 유지
                confirmUpload();
              }}
            >
              {pending ? "등록 중..." : "등록"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
