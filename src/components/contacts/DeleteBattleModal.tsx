"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Volume2, VolumeX } from "lucide-react";
import ContactAvatar from "./ContactAvatar";
import {
  playAttackSound,
  playBattleStartSound,
  playVictorySound,
} from "@/lib/audio/retroSynth";
import type { Contact } from "@/lib/contacts/types";

/** The slice of a contact the battle needs; call sites pass a full Contact. */
export type BattleContact = Pick<
  Contact,
  "first_name" | "last_name" | "full_name" | "email" | "photo" | "company" | "job_title"
>;

const MAX_HP = 100;
const MAX_ENERGY = 100;
const ATTACK_DAMAGE = 25;
// A straight 4-hit win costs 120 energy, so one Cold Brew is always needed.
const ATTACK_COST = 30;
const MUTE_KEY = "contacts.battle-muted";

/** Attack flavor, cycled per swing so a full fight never repeats a move. */
const MOVES = ["REPLY ALL", "DECLINE MEETING", "LEFT ON READ", "ARCHIVE STORM"] as const;

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Which theme color an action button borrows, so intent reads at a glance. */
type ActionTone = "primary" | "warning" | "neutral" | "danger";

const ACTION_TONES: Record<ActionTone, string> = {
  primary: "border-primary/50 text-primary hover:bg-primary/10",
  warning: "border-warning/50 text-warning hover:bg-warning/10",
  neutral: "border-border text-muted-foreground hover:bg-secondary/60",
  danger: "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

/** Battle menu entry: a bold verb plus a plain-language line of consequences. */
function ActionButton({
  label,
  hint,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  hint: string;
  tone: ActionTone;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors disabled:pointer-events-none disabled:opacity-50 ${ACTION_TONES[tone]}`}
    >
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      <span
        className={`text-[10px] ${tone === "danger" ? "text-destructive-foreground/80" : "text-muted-foreground"}`}
      >
        {hint}
      </span>
    </button>
  );
}

/**
 * Retro turn-based boss fight standing in for the delete confirmation.
 * Pure UI: the caller owns the actual deletion (`onDefeat`) and its pending
 * state, so fleeing (`onRun`, ESC, backdrop click) can never delete anything.
 */
export default function DeleteBattleModal({
  contact,
  isDeleting,
  onDefeat,
  onRun,
}: {
  contact: BattleContact;
  isDeleting: boolean;
  onDefeat: () => void;
  onRun: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const [hp, setHp] = useState(MAX_HP);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [swings, setSwings] = useState(0);
  const [defeated, setDefeated] = useState(false);
  const [critical, setCritical] = useState(false);
  const [muted, setMuted] = useState(readMuted);
  const [log, setLog] = useState<readonly string[]>([
    `A wild ${contact.full_name.toUpperCase()} appeared!`,
    "Choose your move.",
  ]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    dialogRef.current?.focus();
    if (!muted) playBattleStartSound();
  }, [muted]);

  const locked = defeated || isDeleting;

  function finish(finalLine: string): void {
    setHp(0);
    setDefeated(true);
    setLog([finalLine, `${contact.full_name} is out of office. Forever.`]);
    if (!muted) playVictorySound();
    onDefeat();
  }

  function attack(): void {
    if (locked) return;
    if (energy < ATTACK_COST) {
      setLog(["You're too drained to attack!", "Grab a COLD BREW first."]);
      return;
    }
    if (!muted) playAttackSound();
    setEnergy((current) => current - ATTACK_COST);
    setSwings((current) => current + 1);
    const move = MOVES[swings % MOVES.length];
    const nextHp = Math.max(0, hp - ATTACK_DAMAGE);
    if (nextHp === 0) {
      finish(`You used ${move}! It's super effective!`);
      return;
    }
    setHp(nextHp);
    setLog([`You used ${move}!`, `${contact.full_name} took ${ATTACK_DAMAGE} damage!`]);
  }

  function drinkColdBrew(): void {
    if (locked) return;
    setEnergy(MAX_ENERGY);
    setLog(["You sip a COLD BREW. Ice cold.", "Energy fully restored!"]);
  }

  function criticalDelete(): void {
    if (locked) return;
    setCritical(true);
    if (!muted) playAttackSound();
    finish("CRITICAL DELETE! A flawless finisher!");
  }

  function toggleMuted(): void {
    setMuted((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        // Private mode: the toggle still works for this battle.
      }
      return next;
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      if (!locked) onRun();
      return;
    }
    if (event.key !== "Tab") return;
    // Minimal focus trap: cycle within the dialog's enabled buttons.
    const buttons =
      dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:enabled");
    if (!buttons || buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const level = contact.first_name.length + contact.last_name.length;
  const bossClass = contact.job_title ?? contact.company ?? "Unmanaged Contact";
  const hpTone = hp > 50 ? "bg-success" : hp > 25 ? "bg-warning" : "bg-destructive";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={locked ? undefined : onRun}
    >
      {critical ? (
        <div aria-hidden="true" className="battle-flash pointer-events-none fixed inset-0 bg-foreground" />
      ) : null}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-lg border border-border bg-card p-4 font-mono text-card-foreground shadow-[6px_6px_0_0_rgba(0,0,0,0.35)]"
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Battle to delete
          </p>
          <button
            type="button"
            onClick={toggleMuted}
            aria-label="Mute battle sounds"
            aria-pressed={muted}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-3">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="truncate font-display text-sm font-bold uppercase tracking-wider"
            >
              {contact.full_name}
            </h2>
            <p className="truncate text-[11px] uppercase text-muted-foreground">
              Lv.{level} · {bossClass}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-bold">HP</span>
              <div className="h-2.5 flex-1 rounded-sm border border-border bg-background">
                <div
                  className={`h-full ${hpTone} transition-[width] duration-500`}
                  style={{ width: `${hp}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums">
                {hp}/{MAX_HP}
              </span>
            </div>
          </div>
          <span
            className={`inline-block shrink-0 [image-rendering:pixelated] ${defeated ? "battle-faint" : "battle-bounce"}`}
          >
            <span key={swings} className={`inline-block ${swings > 0 && !defeated ? "battle-shake" : ""}`}>
              <ContactAvatar contact={contact} size="lg" />
            </span>
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-surface p-2">
          <span className="text-[10px] font-bold uppercase">You</span>
          <span className="text-[10px] uppercase text-muted-foreground">Energy</span>
          <div className="h-2.5 flex-1 rounded-sm border border-border bg-background">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{ width: `${energy}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums">
            {energy}/{MAX_ENERGY}
          </span>
        </div>

        <div
          role="log"
          aria-live="polite"
          className="mt-3 h-14 rounded-md border border-border bg-background p-2 text-xs leading-5"
        >
          {log.map((line) => (
            <p key={line} className="truncate">
              {line}
            </p>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <ActionButton
            label="Attack"
            hint={`Deal ${ATTACK_DAMAGE} damage · costs ${ATTACK_COST} energy`}
            tone="primary"
            onClick={attack}
            disabled={locked}
          />
          <ActionButton
            label="Cold Brew"
            hint="Restore your energy to full"
            tone="warning"
            onClick={drinkColdBrew}
            disabled={locked}
          />
          <ActionButton
            label="Run"
            hint="Cancel — the contact is kept"
            tone="neutral"
            onClick={onRun}
            disabled={locked}
          />
          <ActionButton
            label="Critical Delete"
            hint="Skip the fight, delete now"
            tone="danger"
            onClick={criticalDelete}
            disabled={locked}
          />
        </div>

        {defeated ? (
          <p
            role="status"
            className="mt-2 animate-pulse text-center text-[11px] uppercase tracking-widest text-destructive motion-reduce:animate-none"
          >
            {isDeleting ? "Erasing from database…" : "Victory!"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
