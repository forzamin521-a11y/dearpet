"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Minus, Plus, X } from "lucide-react";
import { searchCustomers } from "@/lib/actions/customers";
import {
  createReservation,
  createReservationWithNewCustomer,
  updateReservation,
} from "@/lib/actions/reservations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  SELECTABLE_ALIMTALK,
  SENIOR_PET_AGE,
  SLOT_MINUTES,
} from "@/lib/constants";
import {
  ageInYears,
  minutesToTime,
  formatKoreanTime,
  timeToMinutes,
} from "@/lib/time";
import type { ReservationFull } from "@/lib/data/reservations";
import type {
  AddonItem,
  AlimtalkKind,
  ConsentForm,
  Customer,
  GroomingProduct,
  Pet,
  ProductOption,
  Profile,
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
  optionId: string | null;
  addons: AddonItem[];
}

interface NewPetDraft {
  name: string;
  breed: string;
  weight: string;
  birth: string;
  optionId: string | null;
  addons: AddonItem[];
}

const EMPTY_NEW_PET: NewPetDraft = {
  name: "",
  breed: "",
  weight: "",
  birth: "",
  optionId: null,
  addons: [],
};

interface ReservationModalProps {
  prefill: ModalPrefill | null;
  editing: ReservationFull | null;
  staff: Profile[];
  products: GroomingProduct[];
  options: ProductOption[];
  consentForms: ConsentForm[];
  dayReservations: ReservationFull[];
  onClose: () => void;
}

export function ReservationModal({
  prefill,
  editing,
  staff,
  products,
  options,
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
            optionId: rp.product_option_id,
            addons: rp.addons ?? [],
          }))
      : []
  );
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const optionById = useMemo(
    () => new Map(options.map((o) => [o.id, o])),
    [options]
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

  /** 선택된 옵션들의 최대 소요시간(분) */
  const computeMaxDuration = (
    selections: PetSelection[],
    drafts: NewPetDraft[]
  ) => {
    const ids =
      mode === "existing"
        ? selections.filter((s) => s.selected).map((s) => s.optionId)
        : drafts.map((p) => p.optionId);
    const durations = ids
      .filter((id): id is string => !!id)
      .map((id) => optionById.get(id)?.duration_minutes ?? 0);
    return durations.length > 0 ? Math.max(...durations) : 0;
  };

  /** 종료시간 자동 계산 (사용자가 직접 종료시간을 만진 뒤에는 건드리지 않음) */
  const autoEnd = (
    start: string,
    selections: PetSelection[],
    drafts: NewPetDraft[]
  ) => {
    if (endTouched || !start) return;
    const duration = computeMaxDuration(selections, drafts) || 60;
    setEndTime(minutesToTime(timeToMinutes(start) + duration));
  };

  /** 노령견이 선택되면 노령견 알림톡 자동 체크 */
  const maybeAutoSenior = (selections: PetSelection[]) => {
    const senior = selections.some(
      (s) =>
        s.selected &&
        s.pet.birth_date &&
        ageInYears(s.pet.birth_date) >= SENIOR_PET_AGE
    );
    if (senior) {
      setAlimtalkKinds((prev) =>
        prev.includes("senior") ? prev : [...prev, "senior"]
      );
    }
  };

  const selectCustomer = (c: CustomerWithPets) => {
    setCustomer(c);
    setResults([]);
    setQuery("");
    const selections = c.pets.map((pet, i) => ({
      pet,
      selected: i === 0,
      optionId: null,
      addons: [],
    }));
    setPetSelections(selections);
    maybeAutoSenior(selections);
    autoEnd(startTime, selections, newPets);
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
    setAlimtalkKinds((prev) =>
      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]
    );
  };

  const canSubmit =
    date &&
    startTime &&
    endTime &&
    (mode === "existing"
      ? !!customer && petSelections.some((s) => s.selected)
      : newName.trim() && newPets.some((p) => p.name.trim()));

  const submit = () => {
    const base = {
      staffId,
      date,
      startTime,
      endTime,
      memo,
      alimtalkKinds:
        alimtalkKinds.includes("consent") && !consentFormId
          ? alimtalkKinds.filter((k) => k !== "consent")
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
              .map((s) => ({
                petId: s.pet.id,
                productOptionId: s.optionId,
                price: s.optionId
                  ? (optionById.get(s.optionId)?.price ?? null)
                  : null,
                addons: s.addons,
              })),
          },
          { notifyChange: true }
        );
      } else if (mode === "existing" && customer) {
        result = await createReservation({
          ...base,
          customerId: customer.id,
          pets: petSelections
            .filter((s) => s.selected)
            .map((s) => ({
              petId: s.pet.id,
              productOptionId: s.optionId,
              price: s.optionId
                ? (optionById.get(s.optionId)?.price ?? null)
                : null,
              addons: s.addons,
            })),
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
          validPets.map((p) => ({
            productOptionId: p.optionId,
            price: p.optionId
              ? (optionById.get(p.optionId)?.price ?? null)
              : null,
            addons: p.addons,
          }))
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
                <Card>
                  <CardContent className="flex items-start justify-between pt-4">
                    <div>
                      <p className="font-semibold">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.phones?.[0] ?? "전화번호 없음"}
                      </p>
                      {customer.memo && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          📝 {customer.memo}
                        </p>
                      )}
                    </div>
                    {!editing && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          setCustomer(null);
                          setPetSelections([]);
                        }}
                      >
                        <X />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="relative">
                  <Input
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder="보호자 호칭 또는 반려동물명 검색"
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
                            {c.name}
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
                    <Label className="text-xs">보호자 호칭 *</Label>
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
                        <PetServiceFields
                          products={products}
                          options={options}
                          optionId={selection.optionId}
                          addons={selection.addons}
                          onOptionChange={(optionId) => {
                            const next = petSelections.map((s, j) =>
                              j === i ? { ...s, optionId } : s
                            );
                            setPetSelections(next);
                            autoEnd(startTime, next, newPets);
                          }}
                          onAddonsChange={(addons) =>
                            setPetSelections((prev) =>
                              prev.map((s, j) => (j === i ? { ...s, addons } : s))
                            )
                          }
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
                        <Input
                          value={pet.breed}
                          onChange={(e) =>
                            setNewPets((prev) =>
                              prev.map((p, j) =>
                                j === i ? { ...p, breed: e.target.value } : p
                              )
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
                      <PetServiceFields
                        products={products}
                        options={options}
                        optionId={pet.optionId}
                        addons={pet.addons}
                        onOptionChange={(optionId) => {
                          const next = newPets.map((p, j) =>
                            j === i ? { ...p, optionId } : p
                          );
                          setNewPets(next);
                          autoEnd(startTime, petSelections, next);
                        }}
                        onAddonsChange={(addons) =>
                          setNewPets((prev) =>
                            prev.map((p, j) => (j === i ? { ...p, addons } : p))
                          )
                        }
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

          {/* ④ 알림톡 선택 발송 */}
          {!editing && (
            <section className="space-y-3">
              <p className="text-sm font-semibold text-primary">
                ④ 알림톡 선택 발송
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
                    {kind === "senior" && hasSeniorPet && (
                      <span className="text-xs text-orange-600">
                        (노령견 자동 선택)
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {alimtalkKinds.includes("consent") && (
                <div className="space-y-1">
                  <Label className="text-xs">⑤ 발송할 동의서</Label>
                  <Select
                    value={consentFormId ?? ""}
                    onValueChange={setConsentFormId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="동의서를 선택해 주세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {consentForms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          {form.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

/** 펫별 상품 옵션 + 추가 옵션 입력 */
function PetServiceFields({
  products,
  options,
  optionId,
  addons,
  onOptionChange,
  onAddonsChange,
}: {
  products: GroomingProduct[];
  options: ProductOption[];
  optionId: string | null;
  addons: AddonItem[];
  onOptionChange: (optionId: string | null) => void;
  onAddonsChange: (addons: AddonItem[]) => void;
}) {
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState("");

  const addAddon = () => {
    if (!addonName.trim()) return;
    onAddonsChange([
      ...addons,
      { name: addonName.trim(), price: addonPrice === "" ? 0 : Number(addonPrice) },
    ]);
    setAddonName("");
    setAddonPrice("");
  };

  return (
    <div className="space-y-2">
      <Select
        value={optionId ?? "none"}
        onValueChange={(v) => onOptionChange(v === "none" ? null : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="미용 서비스 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">서비스 미지정</SelectItem>
          {products.map((product) => {
            const productOptions = options.filter(
              (o) => o.product_id === product.id
            );
            if (productOptions.length === 0) return null;
            return (
              <SelectGroup key={product.id}>
                <SelectLabel>
                  {product.emoji} {product.name}
                </SelectLabel>
                {productOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name} ·{" "}
                    {Math.floor(option.duration_minutes / 60) > 0
                      ? `${Math.floor(option.duration_minutes / 60)}시간`
                      : ""}
                    {option.duration_minutes % 60 > 0
                      ? `${option.duration_minutes % 60}분`
                      : ""}
                    {option.price != null &&
                      ` · ${option.price.toLocaleString()}원`}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>

      {addons.map((addon, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-sm"
        >
          <span>
            추가&gt; {addon.name} ({addon.price.toLocaleString()}원)
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => onAddonsChange(addons.filter((_, j) => j !== i))}
          >
            <X />
          </Button>
        </div>
      ))}
      <div className="flex gap-1.5">
        <Input
          className="h-8 flex-1 text-sm"
          value={addonName}
          onChange={(e) => setAddonName(e.target.value)}
          placeholder="추가 옵션 (예: 얼컷)"
        />
        <Input
          className="h-8 w-24 text-sm"
          type="number"
          step="1000"
          value={addonPrice}
          onChange={(e) => setAddonPrice(e.target.value)}
          placeholder="가격"
        />
        <Button size="sm" variant="outline" onClick={addAddon}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}
