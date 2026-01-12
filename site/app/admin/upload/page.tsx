import UploadForm from "app/components/upload-form";
import { PhotoNavbar } from "app/components/photonav";

export default function UploadPage() {
  return (
    <section>
      <PhotoNavbar />
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Upload</h1>
      <UploadForm />
    </section>
  );
}
