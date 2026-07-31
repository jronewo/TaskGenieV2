import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "../../../app/components/ui/button";
import { Input } from "../../../app/components/ui/input";
import { Label } from "../../../app/components/ui/label";
import { useMyProfile, useUpdateProfile, useUploadAvatar, useChangePassword } from "../hooks/useProfile";
import { ApiError } from "../../../core/api/client";

const nameSchema = z.object({ name: z.string().min(1, "Name is required") });
type NameForm = z.infer<typeof nameSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Minimum 8 characters"),
    confirm: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirm, { message: "Passwords do not match", path: ["confirm"] });
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const changePassword = useChangePassword();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nameForm = useForm<NameForm>({ resolver: zodResolver(nameSchema), values: { name: profile?.name ?? "" } });
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const onSaveName = nameForm.handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync({ name: values.name });
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cập nhật hồ sơ thất bại.");
    }
  });

  const onChangePassword = passwordForm.handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast.success("Password changed successfully.");
      passwordForm.reset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Đổi mật khẩu thất bại.");
    }
  });

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      await uploadAvatar.mutateAsync(file);
      toast.success("Avatar updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Tải ảnh đại diện thất bại.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm gap-2">
        <Loader2 className="animate-spin" size={16} /> Loading profile...
      </div>
    );
  }

  if (isError || !profile) {
    return <div className="flex-1 flex items-center justify-center text-red-500 text-sm">Không tải được hồ sơ.</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        <p className="text-sm text-gray-500">Manage your personal information and account security.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#1A237E] flex items-center justify-center text-white text-xl font-bold">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name ?? ""} className="w-full h-full object-cover" />
            ) : (
              (profile.name ?? profile.email ?? "?").charAt(0).toUpperCase()
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadAvatar.isPending}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
          >
            {uploadAvatar.isPending ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatarFile(e.target.files?.[0])}
          />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{profile.name}</div>
          <div className="text-xs text-gray-500">{profile.email}</div>
          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">{profile.role}</div>
        </div>
      </div>

      <form onSubmit={onSaveName} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Basic information</h3>
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" {...nameForm.register("name")} />
          {nameForm.formState.errors.name && (
            <p className="text-xs text-red-600">{nameForm.formState.errors.name.message}</p>
          )}
        </div>
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving..." : "Save changes"}
        </Button>
      </form>

      <form onSubmit={onChangePassword} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Change password</h3>
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" type="password" {...passwordForm.register("currentPassword")} />
          {passwordForm.formState.errors.currentPassword && (
            <p className="text-xs text-red-600">{passwordForm.formState.errors.currentPassword.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
          {passwordForm.formState.errors.newPassword && (
            <p className="text-xs text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" type="password" {...passwordForm.register("confirm")} />
          {passwordForm.formState.errors.confirm && (
            <p className="text-xs text-red-600">{passwordForm.formState.errors.confirm.message}</p>
          )}
        </div>
        <Button type="submit" variant="outline" disabled={changePassword.isPending}>
          {changePassword.isPending ? "Updating..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}
