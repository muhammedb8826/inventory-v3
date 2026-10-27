"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { ChevronDownIcon, LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";

export function HeaderUserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-10 gap-2 rounded-xl px-1.5 hover:bg-[var(--frappe-section-head)] sm:px-2"
        >
          <Avatar className="size-8 rounded-full">
            <AvatarFallback className="rounded-full bg-teal-600/15 text-xs font-semibold text-teal-800 dark:text-teal-200">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block truncate text-sm font-semibold text-[var(--frappe-text)]">
              {user.fullName}
            </span>
            <span className="block truncate text-[11px] text-[var(--frappe-text-muted)]">
              {user.role?.name ?? "User"}
            </span>
          </span>
          <ChevronDownIcon className="hidden size-3.5 text-[var(--frappe-text-muted)] sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{user.fullName}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserIcon className="size-4" />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/branding">
            <SettingsIcon className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void logout()}
          className="text-rose-600 focus:text-rose-600"
        >
          <LogOutIcon className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
