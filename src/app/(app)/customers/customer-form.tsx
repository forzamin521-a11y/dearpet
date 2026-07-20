"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { BreedInput } from "@/components/breed-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerInput, PetInput } from "@/lib/actions/customers";
import type { CustomerWithPets } from "./page";

export interface CustomerFormValues {
  customer: CustomerInput;
  pets: PetInput[];
}

const EMPTY_PET: PetInput = {
  name: "",
  species: "dog",
  breed: "",
  weight_kg: null,
  age_years: null,
  marking: null,
  memo: "",
};

export function CustomerForm({
  initial,
  onSubmit,
  pending,
  submitLabel,
}: {
  initial?: CustomerWithPets;
  onSubmit: (values: CustomerFormValues) => void;
  pending: boolean;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phones, setPhones] = useState<string[]>(
    initial?.phones?.length ? initial.phones : [""]
  );
  const [alimtalkOptIn, setAlimtalkOptIn] = useState(
    initial?.alimtalk_opt_in ?? true
  );
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [pets, setPets] = useState<PetInput[]>(
    initial?.pets?.length
      ? initial.pets.map((p) => ({
          id: p.id,
          name: p.name,
          species: p.species,
          breed: p.breed,
          weight_kg: p.weight_kg,
          age_years: p.age_years,
          marking: p.marking,
          memo: p.memo,
        }))
      : [{ ...EMPTY_PET }]
  );

  const updatePet = (index: number, patch: Partial<PetInput>) => {
    setPets((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
    );
  };

  return (
    <div className="space-y-5">
      {/* 보호자 정보 */}
      <div className="space-y-4">
        <p className="text-sm font-semibold text-primary">① 보호자 정보</p>
        <div className="space-y-2">
          <Label>보호자 호칭</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 솜이맘"
          />
        </div>
        {phones.map((phone, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={phone}
              onChange={(e) =>
                setPhones((prev) =>
                  prev.map((p, j) => (j === i ? e.target.value : p))
                )
              }
              placeholder="010-0000-0000"
            />
            {i === 0 ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-xs text-muted-foreground">알림톡</span>
                <Switch
                  checked={alimtalkOptIn}
                  onCheckedChange={setAlimtalkOptIn}
                />
              </div>
            ) : (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() =>
                  setPhones((prev) => prev.filter((_, j) => j !== i))
                }
              >
                <Minus />
              </Button>
            )}
          </div>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="text-primary"
          onClick={() => setPhones((prev) => [...prev, ""])}
        >
          <Plus /> 전화번호 추가
        </Button>
        <div className="space-y-2">
          <Label>보호자 메모</Label>
          <Textarea
            rows={2}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>
      </div>

      {/* 반려동물 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-primary">② 반려동물</p>
          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant="outline"
              disabled={pets.length === 0}
              onClick={() => setPets((prev) => prev.slice(0, -1))}
            >
              <Minus />
            </Button>
            <span className="text-sm">{pets.length}마리</span>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setPets((prev) => [...prev, { ...EMPTY_PET }])}
            >
              <Plus />
            </Button>
          </div>
        </div>

        {pets.map((pet, i) => (
          <Card key={pet.id ?? `new-${i}`}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  value={pet.name}
                  onChange={(e) => updatePet(i, { name: e.target.value })}
                  placeholder="반려동물명"
                />
                <Tabs
                  value={pet.species}
                  onValueChange={(v) =>
                    updatePet(i, { species: v as "dog" | "cat" })
                  }
                >
                  <TabsList>
                    <TabsTrigger value="dog">강아지</TabsTrigger>
                    <TabsTrigger value="cat">고양이</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">품종</Label>
                  <BreedInput
                    value={pet.breed}
                    onChange={(breed) => updatePet(i, { breed })}
                    species={pet.species}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">몸무게 (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={pet.weight_kg ?? ""}
                    onChange={(e) =>
                      updatePet(i, {
                        weight_kg:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">나이</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={pet.age_years ?? ""}
                    onChange={(e) =>
                      updatePet(i, {
                        age_years:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    placeholder="세"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">마킹여부</Label>
                  <Select
                    value={
                      pet.marking == null ? "unknown" : pet.marking ? "yes" : "no"
                    }
                    onValueChange={(v) =>
                      updatePet(i, {
                        marking: v === "unknown" ? null : v === "yes",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">모름</SelectItem>
                      <SelectItem value="yes">O</SelectItem>
                      <SelectItem value="no">X</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">반려동물 메모</Label>
                <Textarea
                  rows={2}
                  value={pet.memo}
                  onChange={(e) => updatePet(i, { memo: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        className="w-full"
        disabled={
          pending ||
          (!name.trim() &&
            !phones.some((p) => p.trim()) &&
            !pets.some((p) => p.name.trim()))
        }
        onClick={() =>
          onSubmit({
            customer: {
              name,
              phones,
              alimtalk_opt_in: alimtalkOptIn,
              memo,
            },
            pets: pets.filter((p) => p.name.trim()),
          })
        }
      >
        {pending ? "저장 중..." : submitLabel}
      </Button>
    </div>
  );
}
