"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { History, Minus, Plus, X } from "lucide-react";
import { searchCustomers } from "@/lib/actions/customers";
import {
  getCustomerSignedConsents,
  type SignedConsentInfo,
} from "@/lib/actions/messaging";
import { BreedInput } from "@/components/breed-input";
import {
  createReservation,
  createReservationWithNewCustomer,
  getCustomerGroomingHistory,
  updateReservation,
  type CustomerHistoryEntry,
  type HistoryServiceItem,
} from "@/lib/actions/reservations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  ALIMTALK_KIND_LABEL,
  RESERVATION_STATUS,
  SELECTABLE_ALIMTALK,
  SENIOR_PET_AGE,
  SLOT_MINUTES,
} from "@/lib/constants";
import {
  ageInYears,
  formatKoreanDate,
  minutesToTime,
  formatKoreanTime,
  timeToMinutes,
} from "@/lib/time";
import type { ReservationFull } from "@/lib/data/reservations";
import { cn } from "@/lib/utils";
import type {
  AlimtalkKind,
  ConsentForm,
  Customer,
  Pet,
  Profile,
  Service,
} from "@/lib/types";

export interface ModalPrefill {
  date: string;
  startTime: string | null;
  staffId: string | null;
}

type CustomerWithPets = Customer & { pets: Pet[] };

interface PetSelection {
  pet: Pet;
  selected: boolean;
  serviceId: string | null;
}

interface NewPetDraft {
  name: string;
  breed: string;
  weight: string;
  birth: string;
  serviceId: string | null;
}

const EMPTY_NEW_PET: NewPetDraft = {
  name: "",
  breed: "",
  weight: "",
  birth: "",
  serviceId: null,
};

interface ReservationModalProps {
  prefill: ModalPrefill | null;
  editing: ReservationFull | null;
  staff: Profile[];
  services: Service[];
  consentForms: ConsentForm[];
  dayReservations: ReservationFull[];
  onClose: () => void;
}

export function ReservationModal({
  prefill,
  editing,
  staff,
  services,
  consentForms,
  dayReservations,
  onClose,
}: ReservationModalProps) {
  const [pending, startTransition] = useTransition();

  // ----- 고객 -----
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerWithPets[]>([]);
  const [customer, setCustomer] = useState<CustomerWithPets | null>(() => {
    if (!editing?.customer) return null;
    const pets = editing.reservation_pets
      .map((rp) => rp.pet)
      .filter(Boolean) as Pet[];
    return { ...(editing.customer as unknown as Customer), pets };
  });
  const [petSelections, setPetSelections] = useState<PetSelection[]>(() =>
    editing
      ? editing.reservation_pets
          .filter((rp) => rp.pet)
          .map((rp) => ({
            pet: rp.pet!,
            selected: true,
            serviceId: rp.service_id,
          }))
      : []
  );
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최근 미용 이력
  const [history, setHistory] = useState<CustomerHistoryEntry[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPending, startHistoryTransition] = useTransition();

  // 신규 고객
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [newPets, setNewPets] = useState<NewPetDraft[]>([{ ...EMPTY_NEW_PET }]);

  // ----- 예약 정보 -----
  const [date, setDate] = useState(editing?.date ?? prefill?.date ?? "");
  const [startTime, setStartTime] = useState(
    editing
      ? String(editing.start_time).slice(0, 5)
      : prefill?.startTime ?? "10:00"
  );
  const [endTime, setEndTime] = useState(() =>
    editing
      ? String(editing.end_time).slice(0, 5)
      : prefill?.startTime
        ? minutesToTime(timeToMinutes(prefill.startTime) + 60)
        : ""
  );
  const [endTouched, setEndTouched] = useState(!!editing);
  const [staffId, setStaffId] = useState<string | null>(
    editing?.staff_id ?? prefill?.staffId ?? null
  );
  const [memo, setMemo] = useState(editing?.memo ?? "");

  // ----- 알림톡 / 동의서 -----
  const [alimtalkKinds, setAlimtalkKinds] = useState<AlimtalkKind[]>(
    editing ? [] : ["basic"]
  );
  const [consentFormId, setConsentFormId] = useState<string | null>(null);
  // 이미 서명 완료한 동의서 (재발송 판단 안내용)
  const [signedConsents, setSignedConsents] = useState<SignedConsentInfo[]>([]);

  // 고객 검색 (디바운스)
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      const data = await searchCustomers(value);
      setResults(data as unknown as CustomerWithPets[]);
    }, 250);
  };

  const serviceById = useMemo(
    () => new Map(services.map((s) => [s.id, s])),
    [services]
  );

  // 노령견 여부 (라벨 표시용)
  const hasSeniorPet = useMemo(() => {
    const pets =
      mode === "existing"
        ? petSelections.filter((s) => s.selected).map((s) => s.pet)
        : [];
    return pets.some(
      (p) => p.birth_date && ageInYears(p.birth_date) >= SENIOR_PET_AGE
    );
  }, [mode, petSelections]);

  /** 선택된 서비스들의 총 소요시간(분) — 여러 마리는 한 마리씩 순차 진행 */
  const computeTotalDuration = (
    selections: PetSelection[],
    drafts: NewPetDraft[]
  ) => {
    const ids =
      mode === "existing"
        ? selections.filter((s) => s.selected).map((s) => s.serviceId)
        : drafts.map((p) => p.serviceId);
    return ids
      .filter((id): id is string => !!id)
      .reduce((sum, id) => sum + (serviceById.get(id)?.duration_minutes ?? 0), 0);
  };

  /** 종료시간 자동 계산 (사용자가 직접 종료시간을 만진 뒤에는 건드리지 않음) */
  const autoEnd = (
    start: string,
    selections: PetSelection[],
    drafts: NewPetDraft[]
  ) => {
    if (endTouched || !start) return;
    const duration = computeTotalDuration(selections, drafts) || 60;
    setEndTime(minutesToTime(timeToMinutes(start) + duration));
  };

  /** 노령견이 선택되면 ⑤ 동의서에 노령견 동의서 자동 선택 (직접 고른 게 있으면 유지) */
  const maybeAutoSenior = (selections: PetSelection[]) => {
    if (editing) return;
    const senior = selections.some(
      (s) =>
        s.selected &&
        s.pet.birth_date &&
        ageInYears(s.pet.birth_date) >= SENIOR_PET_AGE
    );
    if (senior) {
      const seniorForm = consentForms.find((f) => f.title.includes("노령견"));
      if (seniorForm) {
        setConsentFormId((prev) => prev ?? seniorForm.id);
      }
    }
  };

  const selectCustomer = (c: CustomerWithPets) => {
    setCustomer(c);
    setResults([]);
    setQuery("");
    setHistory(null);
    setHistoryOpen(false);
    const selections = c.pets.map((pet, i) => ({
      pet,
      selected: i === 0,
      serviceId: null,
    }));
    setPetSelections(selections);
    maybeAutoSenior(selections);
    autoEnd(startTime, selections, newPets);
    setSignedConsents([]);
    getCustomerSignedConsents(c.id).then(setSignedConsents);
  };

  const toggleHistory = () => {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    if (history) {
      setHistoryOpen(true);
      return;
    }
    if (!customer) return;
    startHistoryTransition(async () => {
      const data = await getCustomerGroomingHistory(customer.id);
      setHistory(data);
      setHistoryOpen(true);
    });
  };

  /** 이력의 서비스를 이번 예약에 그대로 적용 */
  const applyHistoryItem = (item: HistoryServiceItem) => {
    const idx = petSelections.findIndex((s) => s.pet.id === item.petId);
    if (idx < 0) {
      toast.error("현재 고객의 반려동물 목록에 없는 기록입니다.");
      return;
    }
    const serviceValid = !!item.serviceId && serviceById.has(item.serviceId);
    const next = petSelections.map((s, j) =>
      j === idx
        ? {
            ...s,
            selected: true,
            serviceId: serviceValid ? item.serviceId : s.serviceId,
          }
        : s
    );
    setPetSelections(next);
    maybeAutoSenior(next);
    autoEnd(startTime, next, newPets);
    toast.success(
      serviceValid
        ? `${item.petName}에게 이전 서비스를 적용했습니다.`
        : `${item.petName}을(를) 선택했습니다. (당시 서비스가 없어 직접 선택해 주세요)`
    );
  };

  // 시간 겹침 경고 (같은 날짜 + 같은 담당자)
  const overlapWarning = useMemo(() => {
    if (!date || !startTime || !endTime || !staffId) return null;
    const s = timeToMinutes(startTime);
    const e = timeToMinutes(endTime);
    const conflict = dayReservations.find(
      (r) =>
        r.id !== editing?.id &&
        r.date === date &&
        r.staff_id === staffId &&
        !["canceled", "no_show", "deleted"].includes(r.status) &&
        timeToMinutes(String(r.start_time).slice(0, 5)) < e &&
        timeToMinutes(String(r.end_time).slice(0, 5)) > s
    );
    return conflict
      ? `⚠️ 같은 시간대에 ${conflict.customer?.name ?? "다른"} 예약이 있습니다.`
      : null;
  }, [date, startTime, endTime, staffId, dayReservations, editing]);

  // 시간 선택지 (30분 간격, 00:00~23:30)
  const timeChoices = useMemo(() => {
    const list: string[] = [];
    for (let m = 0; m < 24 * 60; m += SLOT_MINUTES) list.push(minutesToTime(m));
    return list;
  }, []);

  const toggleAlimtalk = (kind: AlimtalkKind) => {
    setAlimtalkKinds((prev) => {
      if (prev.includes(kind)) return prev.filter((k) => k !== kind);
      const next = [...prev, kind];
      // 예약금 안내와 기본 예약 안내는 둘 중 하나만 발송
      if (kind === "deposit") return next.filter((k) => k !== "basic");
      if (kind === "basic") return next.filter((k) => k !== "deposit");
      return next;
    });
  };

  const canSubmit =
    date &&
    startTime &&
    endTime &&
    (mode === "existing"
      ? !!customer && petSelections.some((s) => s.selected)
      : newPets.some((p) => p.name.trim()));

  const submit = () => {
    const base = {
      staffId,
      date,
      startTime,
      endTime,
      memo,
      // ⑤에서 동의서를 고르면 동의서 작성 안내 알림톡이 발송된다
      alimtalkKinds: consentFormId
        ? ([...alimtalkKinds, "consent"] as AlimtalkKind[])
        : alimtalkKinds,
      consentFormId,
    };

    startTransition(async () => {
      let result;
      if (editing && customer) {
        result = await updateReservation(
          editing.id,
          {
            ...base,
            customerId: customer.id,
            pets: petSelections
              .filter((s) => s.selected)
              .map((s) => ({ petId: s.pet.id, serviceId: s.serviceId })),
          },
          { notifyChange: true }
        );
      } else if (mode === "existing" && customer) {
        result = await createReservation({
          ...base,
          customerId: customer.id,
          pets: petSelections
            .filter((s) => s.selected)
            .map((s) => ({ petId: s.pet.id, serviceId: s.serviceId })),
        });
      } else {
        const validPets = newPets.filter((p) => p.name.trim());
        result = await createReservationWithNewCustomer(
          { name: newName, phone: newPhone, memo: newMemo },
          validPets.map((p) => ({
            name: p.name,
            breed: p.breed,
            weight_kg: p.weight === "" ? null : Number(p.weight),
            birth_date: p.birth || null,
          })),
          base,
          validPets.map((p) => ({ serviceId: p.serviceId }))
        );
      }

      if (result.ok) {
        toast.success(editing ? "예약이 변경되었습니다." : "예약이 접수되었습니다.");
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "예약 수정" : "예약 등록"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-24">
          {/* ① 보호자 정보 */}
          <section className="space-y-3">
            <p className="text-sm font-semibold text-primary">① 보호자 정보</p>
            {!editing && (
              <Tabs
                value={mode}
                onValueChange={(v) => setMode(v as "existing" | "new")}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="existing" className="flex-1">
                    기존 고객
                  </TabsTrigger>
                  <TabsTrigger value="new" className="flex-1">
                    신규 고객
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {mode === "existing" ? (
              customer ? (
                <>
                  <Card>
                    <CardContent className="flex items-start justify-between pt-4">
                      <div>
                        <p className="font-semibold">
                          {customer.name || "(호칭 없음)"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {customer.phones?.[0] ?? "전화번호 없음"}
                        </p>
                        {customer.memo && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            📝 {customer.memo}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-1 -ml-2 h-7 px-2 text-xs text-primary"
                          disabled={historyPending}
                          onClick={toggleHistory}
                        >
                          <History className="size-3.5" />
                          {historyPending
                            ? "불러오는 중..."
                            : historyOpen
                              ? "최근 기록 접기"
                              : "최근 기록 보기"}
                        </Button>
                      </div>
                      {!editing && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => {
                            setCustomer(null);
                            setPetSelections([]);
                            setHistory(null);
                            setHistoryOpen(false);
                            setSignedConsents([]);
                          }}
                        >
                          <X />
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* 최근 미용 이력 */}
                  {historyOpen && (
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
                      {(history ?? []).length === 0 && (
                        <p className="py-3 text-center text-xs text-muted-foreground">
                          지난 예약 이력이 없습니다.
                        </p>
                      )}
                      {(history ?? [])
                        .filter((entry) => entry.reservationId !== editing?.id)
                        .map((entry) => {
                          const status =
                            RESERVATION_STATUS[
                              entry.status as keyof typeof RESERVATION_STATUS
                            ];
                          return (
                            <div
                              key={entry.reservationId}
                              className="space-y-1.5 rounded-md bg-muted/50 p-2 text-xs"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold">
                                  {formatKoreanDate(entry.date)}
                                </span>
                                {status && (
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${status.bg} ${status.text}`}
                                  >
                                    {status.label}
                                  </span>
                                )}
                              </div>
                              {entry.memo && (
                                <p className="text-muted-foreground">
                                  📝 {entry.memo}
                                </p>
                              )}
                              {entry.items.map((item, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="min-w-0 truncate">
                                    🐾 {item.petName} ·{" "}
                                    {item.serviceLabel ?? "서비스 미지정"}
                                    {item.price != null &&
                                      ` · ${item.price.toLocaleString()}원`}
                                  </span>
                                  {!editing && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 shrink-0 px-2 text-[11px]"
                                      onClick={() => applyHistoryItem(item)}
                                    >
                                      이 서비스로 등록
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </>
              ) : (
                <div className="relative">
                  <Input
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder="휴대폰 뒷자리 4자리 또는 반려동물명 검색"
                    autoFocus
                  />
                  {results.length > 0 && (
                    <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-popover shadow-md">
                      {results.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                            onClick={() => selectCustomer(c)}
                          >
                            {c.name || "(호칭 없음)"}
                            {c.phones?.[0]
                              ? ` (${c.phones[0].slice(-4)})`
                              : ""}{" "}
                            -{" "}
                            {c.pets
                              .map(
                                (p) =>
                                  `${p.name}${p.breed ? ` (${p.breed})` : ""}`
                              )
                              .join(", ") || "반려동물 없음"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">보호자 호칭</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">휴대폰</Label>
                    <Input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="010-0000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">보호자 메모</Label>
                  <Textarea
                    rows={2}
                    value={newMemo}
                    onChange={(e) => setNewMemo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          {/* ② 반려동물 (미용견) */}
          <section className="space-y-3">
            <p className="text-sm font-semibold text-primary">② 미용견</p>

            {mode === "existing" ? (
              petSelections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  고객을 먼저 선택해 주세요.
                </p>
              ) : (
                petSelections.map((selection, i) => (
                  <Card key={selection.pet.id}>
                    <CardContent className="space-y-2 pt-4">
                      <label className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={selection.selected}
                          onCheckedChange={(checked) => {
                            const next = petSelections.map((s, j) =>
                              j === i
                                ? { ...s, selected: checked === true }
                                : s
                            );
                            setPetSelections(next);
                            maybeAutoSenior(next);
                            autoEnd(startTime, next, newPets);
                          }}
                        />
                        <span className="font-medium">
                          {selection.pet.name}
                          {selection.pet.breed && ` (${selection.pet.breed})`}
                        </span>
                        {selection.pet.birth_date &&
                          ageInYears(selection.pet.birth_date) >=
                            SENIOR_PET_AGE && (
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                              노령견
                            </span>
                          )}
                      </label>
                      {selection.selected && (
                        <ServiceChips
                          services={services}
                          serviceId={selection.serviceId}
                          onChange={(serviceId) => {
                            const next = petSelections.map((s, j) =>
                              j === i ? { ...s, serviceId } : s
                            );
                            setPetSelections(next);
                            autoEnd(startTime, next, newPets);
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))
              )
            ) : (
              <>
                {newPets.map((pet, i) => (
                  <Card key={i}>
                    <CardContent className="space-y-2 pt-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={pet.name}
                          onChange={(e) =>
                            setNewPets((prev) =>
                              prev.map((p, j) =>
                                j === i ? { ...p, name: e.target.value } : p
                              )
                            )
                          }
                          placeholder="반려동물명 *"
                        />
                        <BreedInput
                          value={pet.breed}
                          onChange={(breed) =>
                            setNewPets((prev) =>
                              prev.map((p, j) => (j === i ? { ...p, breed } : p))
                            )
                          }
                          placeholder="품종"
                        />
                        <Input
                          type="number"
                          step="0.1"
                          value={pet.weight}
                          onChange={(e) =>
                            setNewPets((prev) =>
                              prev.map((p, j) =>
                                j === i ? { ...p, weight: e.target.value } : p
                              )
                            )
                          }
                          placeholder="몸무게(kg)"
                        />
                        <Input
                          type="date"
                          value={pet.birth}
                          onChange={(e) =>
                            setNewPets((prev) =>
                              prev.map((p, j) =>
                                j === i ? { ...p, birth: e.target.value } : p
                              )
                            )
                          }
                        />
                      </div>
                      <ServiceChips
                        services={services}
                        serviceId={pet.serviceId}
                        onChange={(serviceId) => {
                          const next = newPets.map((p, j) =>
                            j === i ? { ...p, serviceId } : p
                          );
                          setNewPets(next);
                          autoEnd(startTime, petSelections, next);
                        }}
                      />
                    </CardContent>
                  </Card>
                ))}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="icon-sm"
                    variant="outline"
                    disabled={newPets.length <= 1}
                    onClick={() => setNewPets((prev) => prev.slice(0, -1))}
                  >
                    <Minus />
                  </Button>
                  <span className="text-sm">{newPets.length}마리</span>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    onClick={() =>
                      setNewPets((prev) => [...prev, { ...EMPTY_NEW_PET }])
                    }
                  >
                    <Plus />
                  </Button>
                </div>
              </>
            )}
          </section>

          {/* ③ 예약 정보 */}
          <section className="space-y-3">
            <p className="text-sm font-semibold text-primary">③ 예약 정보</p>
            <div className="space-y-1">
              <Label className="text-xs">예약 일자</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">시작 시간</Label>
                <Select
                  value={startTime}
                  onValueChange={(v) => {
                    setStartTime(v);
                    autoEnd(v, petSelections, newPets);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeChoices.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatKoreanTime(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">종료 시간 (자동 계산)</Label>
                <Select
                  value={endTime}
                  onValueChange={(v) => {
                    setEndTime(v);
                    setEndTouched(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeChoices.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatKoreanTime(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">담당자</Label>
              <Select
                value={staffId ?? "none"}
                onValueChange={(v) => setStaffId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">미지정</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.emoji}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {overlapWarning && (
              <p className="text-sm text-orange-600">{overlapWarning}</p>
            )}
            <div className="space-y-1">
              <Label className="text-xs">예약 메모</Label>
              <Textarea
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
          </section>

          {/* ④ 안내 알림톡 발송 */}
          {!editing && (
            <section className="space-y-3">
              <p className="text-sm font-semibold text-primary">
                ④ 안내 알림톡 발송
              </p>
              <div className="space-y-2 rounded-lg border p-3">
                {SELECTABLE_ALIMTALK.map((kind) => (
                  <label
                    key={kind}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={alimtalkKinds.includes(kind)}
                      onCheckedChange={() => toggleAlimtalk(kind)}
                    />
                    {ALIMTALK_KIND_LABEL[kind]}
                    {kind === "deposit" && (
                      <span className="text-xs text-muted-foreground">
                        (당일취소가 잦은 고객 등)
                      </span>
                    )}
                  </label>
                ))}
                <p className="text-xs text-muted-foreground">
                  예약금 안내를 체크하면 기본 예약 안내는 발송되지 않습니다.
                </p>
              </div>
            </section>
          )}

          {/* ⑤ 동의서 발송 */}
          {!editing && (
            <section className="space-y-2">
              <p className="text-sm font-semibold text-primary">⑤ 동의서 발송</p>
              <Select
                value={consentFormId ?? "none"}
                onValueChange={(v) =>
                  setConsentFormId(v === "none" ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">발송 안 함</SelectItem>
                  {consentForms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                동의서를 선택하면 서명 링크가 담긴 알림톡이 함께 발송됩니다.
              </p>
              {hasSeniorPet && (
                <p className="text-xs text-orange-600">
                  노령견이 포함된 예약이라 노령견 동의서가 자동 선택됩니다.
                </p>
              )}
              {signedConsents.length > 0 && (
                <p className="text-xs text-green-700">
                  ✅ 이미 서명 완료:{" "}
                  {signedConsents
                    .map(
                      (c) =>
                        `${c.formTitle}${
                          c.signedAt
                            ? ` (${c.signedAt
                                .slice(2, 10)
                                .replaceAll("-", ". ")})`
                            : ""
                        }`
                    )
                    .join(", ")}
                </p>
              )}
            </section>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="sticky bottom-0 border-t bg-background p-4">
          <Button
            className="w-full"
            size="lg"
            disabled={!canSubmit || pending}
            onClick={submit}
          >
            {pending ? "처리 중..." : editing ? "예약 변경" : "예약 접수"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * 서비스 선택 칩. 한 번 더 누르면 해제된다.
 * 선택한 서비스의 소요시간으로 종료시간이 자동 계산된다.
 */
function ServiceChips({
  services,
  serviceId,
  onChange,
}: {
  services: Service[];
  serviceId: string | null;
  onChange: (serviceId: string | null) => void;
}) {
  if (services.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        설정 → 미용 상품에서 서비스를 먼저 등록해 주세요.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {services.map((service) => {
        const active = serviceId === service.id;
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onChange(active ? null : service.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-accent"
            )}
          >
            {service.emoji}
            {service.name}
          </button>
        );
      })}
    </div>
  );
}
