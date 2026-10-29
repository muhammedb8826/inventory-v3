"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  PageForm,
  PageFormCard,
  PageFormSection,
  PageFormActions,
  FormGrid,
  FormField,
} from "@/components/shared/page-form";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/format";
import { toast } from "sonner";

export default function AccountPage() {
  const { user, updateProfile, changePassword } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
    }
  }, [user]);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ fullName: fullName.trim(), email: email.trim() });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Password changed. Please sign in again.");
    } catch (err) {
      toast.error(errorMessage(err));
      setSavingPassword(false);
    }
  }

  return (
    <AppShell
      title="Account settings"
      subtitle="Update your profile and password"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Account" },
      ]}
      variant="form"
    >
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageForm onSubmit={handleProfileSubmit}>
          <PageFormCard>
            <PageFormSection
              title="Profile"
              description="Your contact details. Role changes are managed by an administrator."
            >
              <FormGrid>
                <FormField label="Full name" htmlFor="fullName" required>
                  <Input
                    id="fullName"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Email" htmlFor="email" required>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </FormField>
                {user?.role?.name ? (
                  <p className="text-sm text-muted-foreground">
                    Role: {user.role.name}
                  </p>
                ) : null}
              </FormGrid>
            </PageFormSection>
          </PageFormCard>
          <PageFormActions>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? <Spinner className="size-4" /> : "Save profile"}
            </Button>
          </PageFormActions>
        </PageForm>
        <PageForm onSubmit={handlePasswordSubmit}>
          <PageFormCard>
            <PageFormSection
              title="Password"
              description="Changing your password signs you out everywhere, including this device."
            >
              <FormGrid>
                <FormField
                  label="Current password"
                  htmlFor="currentPassword"
                  required
                >
                  <PasswordInput
                    id="currentPassword"
                    autoComplete="current-password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="New password" htmlFor="newPassword" required>
                  <PasswordInput
                    id="newPassword"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </FormField>
                <FormField
                  label="Confirm new password"
                  htmlFor="confirmPassword"
                  required
                >
                  <PasswordInput
                    id="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </FormField>
              </FormGrid>
            </PageFormSection>
          </PageFormCard>
          <PageFormActions>
            <Button type="submit" variant="outline" disabled={savingPassword}>
              {savingPassword ? (
                <Spinner className="size-4" />
              ) : (
                "Change password"
              )}
            </Button>
          </PageFormActions>
        </PageForm>
      </div>
    </AppShell>
  );
}
