import { Camera, Loader2, UserRound } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadMyAvatarFn } from "@/lib/user-avatar.functions";

export function ProfilePhotoEditor({ initialImage, name }: { initialImage: string | null; name: string }) {
  const [image, setImage] = useState(initialImage);
  const [busy, setBusy] = useState(false);
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photos must be 5 MB or smaller.");
      return;
    }
    const form = new FormData();
    form.set("file", file);
    setBusy(true);
    try {
      const result = await uploadMyAvatarFn({ data: form });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setImage(result.image);
      toast.success("Profile photo updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t upload the profile photo.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="dash-panel profile-photo-panel" aria-labelledby="profile-photo-title">
    {/* <p className="kicker">PROFILE</p>
    <h2 id="profile-photo-title">Profile picture</h2> */}
    <div className="profile-photo-editor">
      <div className="profile-photo-preview" aria-label={image ? "Current profile picture" : "No profile picture"}>
        {image ? <img src={image} alt={`${name || "Your"} profile`} /> : <UserRound size={36} aria-hidden="true" />}
      </div>
      <div>
        <p className="form-hint">Add a photo so people can recognise your account. This works for users, Admins and Platform Owners.</p>
        <label className="profile-photo-upload">
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={onFile} />
          <Button type="button" variant="outline" disabled={busy} asChild><span>{busy ? <><Loader2 className="spin" size={16}/> Uploading…</> : <><Camera size={16}/> {image ? "Change picture" : "Upload picture"}</>}</span></Button>
        </label>
        <small className="form-hint">JPEG, PNG or WebP · maximum 5 MB</small>
      </div>
    </div>
  </section>;
}
