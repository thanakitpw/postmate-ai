"use client";

import { useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/types/database";

// ─── Constants ─────────────────────────────────────────

const DAYS_OF_WEEK = [
  { value: 0, label: "อา", fullLabel: "อาทิตย์" },
  { value: 1, label: "จ", fullLabel: "จันทร์" },
  { value: 2, label: "อ", fullLabel: "อังคาร" },
  { value: 3, label: "พ", fullLabel: "พุธ" },
  { value: 4, label: "พฤ", fullLabel: "พฤหัสบดี" },
  { value: 5, label: "ศ", fullLabel: "ศุกร์" },
  { value: 6, label: "ส", fullLabel: "เสาร์" },
];

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: "regular_post", label: "โพสต์ปกติ" },
  { value: "article_share", label: "แชร์บทความ" },
  { value: "promotion", label: "โปรโมชั่น" },
  { value: "engagement", label: "สร้างปฏิสัมพันธ์" },
  { value: "repost", label: "รีโพสต์" },
];

// ─── Types ─────────────────────────────────────────────

export interface PlanConfigData {
  month: string;
  activeDays: number[];
  defaultPostsPerDay: number;
  dayOverrides: Record<string, number>;
  slotTypes: Record<string, string>;
  theme: string;
}

interface PlanConfigProps {
  onGenerate: (config: PlanConfigData) => void;
  generating: boolean;
  initialConfig?: PlanConfigData | null;
}

// ─── Component ─────────────────────────────────────────

export function PlanConfig({ onGenerate, generating, initialConfig }: PlanConfigProps) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}`;

  const [month, setMonth] = useState(initialConfig?.month ?? defaultMonth);
  const [activeDays, setActiveDays] = useState<number[]>(
    initialConfig?.activeDays ?? [1, 2, 3, 4, 5]
  );
  const [defaultPostsPerDay, setDefaultPostsPerDay] = useState(
    initialConfig?.defaultPostsPerDay ?? 1
  );
  const [dayOverrides, setDayOverrides] = useState<Record<string, number>>(
    initialConfig?.dayOverrides ?? {}
  );
  const [slotTypes, setSlotTypes] = useState<Record<string, string>>(
    initialConfig?.slotTypes ?? {}
  );
  const [theme, setTheme] = useState(initialConfig?.theme ?? "");
  const [showOverrides, setShowOverrides] = useState(false);

  // ─── Month navigation ─────────────────────────────────

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y ?? 2026, (m ?? 1) - 1 + delta, 1);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    );
  }

  function getMonthLabel(): string {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y ?? 2026, (m ?? 1) - 1, 1);
    return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }

  // ─── Day toggling ─────────────────────────────────────

  function toggleDay(day: number) {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  // ─── Day override ─────────────────────────────────────

  function setDayOverride(day: number, count: number) {
    setDayOverrides((prev) => {
      const next = { ...prev };
      if (count === defaultPostsPerDay || count <= 0) {
        delete next[String(day)];
      } else {
        next[String(day)] = count;
      }
      return next;
    });
  }

  // ─── Slot type ────────────────────────────────────────

  function setSlotType(dayIndex: number, slotIndex: number, type: string) {
    const key = `${dayIndex}_${slotIndex}`;
    setSlotTypes((prev) => {
      const next = { ...prev };
      if (type === "regular_post") {
        delete next[key];
      } else {
        next[key] = type;
      }
      return next;
    });
  }

  // ─── Total posts calculation ──────────────────────────

  function calculateTotalPosts(): number {
    const [y, m] = month.split("-").map(Number);
    const yearNum = y ?? 2026;
    const monthNum = m ?? 1;
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    let total = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(yearNum, monthNum - 1, day).getDay();
      if (!activeDays.includes(dow)) continue;
      total += dayOverrides[String(dow)] ?? defaultPostsPerDay;
    }
    return total;
  }

  // ─── Submit ───────────────────────────────────────────

  function handleGenerate() {
    onGenerate({
      month,
      activeDays,
      defaultPostsPerDay,
      dayOverrides,
      slotTypes,
      theme,
    });
  }

  const totalPosts = calculateTotalPosts();

  return (
    <div className="space-y-6 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50">
          <Calendar className="size-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">ตั้งค่าแผนรายเดือน</h2>
          <p className="text-sm text-gray-500">กำหนดวันโพสต์และธีมของเดือน</p>
        </div>
      </div>

      {/* Month Picker */}
      <div className="space-y-2">
        <Label>เดือน</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex-1 text-center font-medium text-gray-900">
            {getMonthLabel()}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Active Days */}
      <div className="space-y-2">
        <Label>วันที่โพสต์ต่อสัปดาห์</Label>
        <div className="flex gap-1.5">
          {DAYS_OF_WEEK.map((day) => {
            const isActive = activeDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                )}
                title={day.fullLabel}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Default Posts Per Day */}
      <div className="space-y-2">
        <Label htmlFor="posts-per-day">จำนวนโพสต์ต่อวัน (ค่าเริ่มต้น)</Label>
        <Input
          id="posts-per-day"
          type="number"
          min={1}
          max={5}
          value={defaultPostsPerDay}
          onChange={(e) =>
            setDefaultPostsPerDay(
              Math.max(1, Math.min(5, parseInt((e.target as HTMLInputElement).value, 10) || 1))
            )
          }
          className="w-24"
        />
      </div>

      {/* Day Overrides Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowOverrides(!showOverrides)}
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          <Settings2 className="size-4" />
          {showOverrides ? "ซ่อน" : "แสดง"} การตั้งค่ารายวัน
        </button>
      </div>

      {/* Day Overrides + Slot Types */}
      {showOverrides && (
        <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
          {DAYS_OF_WEEK.filter((d) => activeDays.includes(d.value)).map((day) => {
            const postsCount =
              dayOverrides[String(day.value)] ?? defaultPostsPerDay;
            return (
              <div key={day.value} className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium text-gray-700">
                    {day.fullLabel}
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={postsCount}
                    onChange={(e) =>
                      setDayOverride(
                        day.value,
                        Math.max(1, Math.min(5, parseInt((e.target as HTMLInputElement).value, 10) || 1))
                      )
                    }
                    className="w-20"
                  />
                  <span className="text-xs text-gray-500">โพสต์</span>
                </div>

                {/* Slot type selectors */}
                <div className="ml-16 space-y-1.5">
                  {Array.from({ length: postsCount }, (_, slotIdx) => {
                    const slotKey = `${day.value}_${slotIdx}`;
                    const currentType = slotTypes[slotKey] ?? "regular_post";
                    return (
                      <div key={slotIdx} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-14">
                          Slot {slotIdx + 1}
                        </span>
                        <Select
                          value={currentType}
                          onValueChange={(val) =>
                            setSlotType(day.value, slotIdx, val ?? "regular_post")
                          }
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTENT_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Theme */}
      <div className="space-y-2">
        <Label htmlFor="monthly-theme">ธีมของเดือน</Label>
        <Textarea
          id="monthly-theme"
          placeholder="เช่น แคมเปญซัมเมอร์เซลล์, เดือนแห่งสุขภาพ, โปรโมชั่นวันแม่..."
          value={theme}
          onChange={(e) => setTheme((e.target as HTMLTextAreaElement).value)}
          className="min-h-[80px]"
        />
      </div>

      {/* Summary + Generate */}
      <div className="flex flex-col gap-3 rounded-lg border border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-900">
            รวม {totalPosts} โพสต์ในเดือนนี้
          </p>
          <p className="text-xs text-indigo-600">
            {activeDays.length} วันต่อสัปดาห์
          </p>
        </div>
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={generating || activeDays.length === 0}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          {generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {generating ? "กำลังสร้าง..." : "สร้างแผนด้วย AI"}
        </Button>
      </div>
    </div>
  );
}
