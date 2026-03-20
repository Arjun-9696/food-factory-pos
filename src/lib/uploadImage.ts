import axios from "axios";

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
}

export async function uploadImageToCloudinary(
  file: File
): Promise<{ url: string; error: string | null }> {
  if (!cloudName || !uploadPreset) {
    return { url: "", error: "Cloudinary not configured" };
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await axios.post<CloudinaryUploadResult>(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      }
    );

    if (response.data?.secure_url) {
      return { url: response.data.secure_url, error: null };
    }

    return { url: "", error: "Upload failed" };
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return {
      url: "",
      error: error.response?.data?.error?.message || error.message || "Upload failed",
    };
  }
}

export function getOptimizedImageUrl(url: string, width = 500): string {
  if (!url) return "";
  if (!url.includes("cloudinary.com")) return url;

  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;

  return `${parts[0]}/upload/w_${width},c_fill,f_auto,q_auto/${parts[1]}`;
}
