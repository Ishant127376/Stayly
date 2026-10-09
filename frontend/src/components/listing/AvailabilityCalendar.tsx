"use client";

import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, parseISO, startOfDay, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { BlockedRange } from "@/types/listing";

type AvailabilityCalendarProps = {
  blockedRanges: BlockedRange[];
  checkIn: Date | null;
  checkOut: Date | null;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
};

const today = startOfDay(new Date());

export function AvailabilityCalendar({ blockedRanges, checkIn, checkOut, onChange }: AvailabilityCalendarProps) {
  const [month, setMonth] = useState(startOfMonth(today));
  const [message, setMessage] = useState("");
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) }), [month]);

  function isBlocked(day: Date) {
    return blockedRanges.some((range) => {
      const start = parseISO(range.check_in);
      const end = parseISO(range.check_out);
      return !isBefore(day, start) && isBefore(day, end);
    });
  }

  function hasBlockedDayBetween(start: Date, end: Date) {
    return blockedRanges.some((range) => {
      const blockedStart = parseISO(range.check_in);
      const blockedEnd = parseISO(range.check_out);
      return isBefore(blockedStart, end) && isAfter(blockedEnd, start);
    });
  }

  function chooseDay(day: Date) {
    if (isBefore(day, today) || isBlocked(day)) return;
    setMessage("");
    if (!checkIn || checkOut || !isAfter(day, checkIn)) {
      onChange(day, null);
      return;
    }
    if (hasBlockedDayBetween(checkIn, day)) {
      setMessage("Your dates include unavailable nights. Choose another range.");
      return;
    }
    onChange(checkIn, day);
  }

  return <div className="availability-calendar">
    <div className="calendar-heading"><div><span className="eyebrow">Availability</span><h3>Select your stay</h3></div><button className="calendar-clear" type="button" onClick={() => { onChange(null, null); setMessage(""); }} disabled={!checkIn && !checkOut}><X size={14} /> Clear</button></div>
    <div className="calendar-nav"><button type="button" onClick={() => setMonth(subMonths(month, 1))} disabled={isSameMonth(month, today)} aria-label="Previous month"><ChevronLeft size={17} /></button><strong>{format(month, "MMMM yyyy")}</strong><button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month"><ChevronRight size={17} /></button></div>
    <div className="calendar-weekdays">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
    <div className="calendar-days">
      {days.map((day) => {
        const blocked = isBlocked(day);
        const past = isBefore(day, today);
        const selectedStart = checkIn && isSameDay(day, checkIn);
        const selectedEnd = checkOut && isSameDay(day, checkOut);
        const inRange = checkIn && checkOut && isAfter(day, checkIn) && isBefore(day, checkOut);
        return <button className={`calendar-day ${!isSameMonth(day, month) ? "calendar-day--muted" : ""} ${blocked || past ? "calendar-day--disabled" : ""} ${selectedStart ? "calendar-day--start" : ""} ${selectedEnd ? "calendar-day--end" : ""} ${inRange ? "calendar-day--range" : ""}`} key={day.toISOString()} type="button" disabled={blocked || past} onClick={() => chooseDay(day)} aria-label={format(day, "MMMM d, yyyy")} aria-pressed={Boolean(selectedStart || selectedEnd)}>{format(day, "d")}</button>;
      })}
    </div>
    <div className="calendar-legend"><span><i className="legend-dot legend-dot--today" /> Today</span><span><i className="legend-dot legend-dot--blocked" /> Unavailable</span></div>
    {message && <p className="calendar-message"><CalendarDays size={15} /> {message}</p>}
  </div>;
}
