"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { searchBreeds } from "@/lib/breeds";

/**
 * 품종 입력 + 자동완성.
 * "요"만 입력해도 요크셔테리어/요키믹스/요키푸 등을 제안하고,
 * 목록에 없는 품종은 그대로 직접 입력하면 된다.
 */
export function BreedInput({
  value,
  onChange,
  species,
  placeholder = "예: 말티푸",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  species?: "dog" | "cat";
  placeholder?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const suggestions = focused && !dismissed ? searchBreeds(value, species) : [];
  // 이미 정확히 일치하는 값 하나뿐이면 제안할 게 없음
  const visible =
    suggestions.length > 0 &&
    !(suggestions.length === 1 && suggestions[0] === value);

  return (
    <div className={className ? `relative ${className}` : "relative"}>
      <Input
        value={value}
        onChange={(e) => {
          setDismissed(false);
          onChange(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setDismissed(true);
        }}
        placeholder={placeholder}
      />
      {visible && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-popover shadow-md">
          {suggestions.map((breed) => (
            <li key={breed}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                // onMouseDown: blur보다 먼저 실행되도록 (click은 blur 후라 목록이 사라짐)
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(breed);
                  setDismissed(true);
                }}
              >
                {breed}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
