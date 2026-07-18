"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { searchBreeds } from "@/lib/breeds";

/**
 * 품종 입력 + 자동완성.
 * "요"만 입력해도 요크셔테리어/요키믹스/요키푸 등을 제안하고,
 * 방향키(↑↓) + Enter 또는 클릭으로 선택한다.
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
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = focused && !dismissed ? searchBreeds(value, species) : [];
  // 이미 정확히 일치하는 값 하나뿐이면 제안할 게 없음
  const visible =
    suggestions.length > 0 &&
    !(suggestions.length === 1 && suggestions[0] === value);

  const select = (breed: string) => {
    onChange(breed);
    setDismissed(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setDismissed(true);
      setActiveIndex(-1);
      return;
    }
    if (!visible) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        select(suggestions[activeIndex]);
      }
    }
  };

  return (
    <div className={className ? `relative ${className}` : "relative"}>
      <Input
        value={value}
        onChange={(e) => {
          setDismissed(false);
          setActiveIndex(-1);
          onChange(e.target.value);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={visible}
        aria-autocomplete="list"
      />
      {visible && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-popover shadow-md">
          {suggestions.map((breed, i) => (
            <li key={breed}>
              <button
                type="button"
                ref={(el) => {
                  if (el && i === activeIndex) {
                    el.scrollIntoView({ block: "nearest" });
                  }
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                  i === activeIndex && "bg-accent"
                )}
                // onMouseDown: blur보다 먼저 실행되도록 (click은 blur 후라 목록이 사라짐)
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(breed);
                }}
                onMouseEnter={() => setActiveIndex(i)}
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
