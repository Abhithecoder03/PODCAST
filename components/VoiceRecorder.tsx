import React, { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Mic, Square, Loader } from "lucide-react";
import { useUploadFiles } from "@xixixao/uploadstuff/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "./ui/use-toast";

interface VoiceRecorderProps {
  setAudioStorageId: (id: any) => void;
  setAudio: (url: string) => void;
  setAudioDuration: (duration: number) => void;
}

const VoiceRecorder = ({
  setAudioStorageId,
  setAudio,
  setAudioDuration,
}: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const { startUpload } = useUploadFiles(generateUploadUrl);
  const getAudioUrl = useMutation(api.podcasts.getUrl);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error accessing microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/mpeg" });
        const fileName = `recording-${uuidv4()}.mp3`;
        const file = new File([audioBlob], fileName, { type: "audio/mpeg" });

        try {
          setIsUploading(true);
          const uploaded = await startUpload([file]);
          const storageId = (uploaded[0].response as any).storageId;
          setAudioStorageId(storageId);
          const audioUrl = await getAudioUrl({ storageId });
          setAudio(audioUrl!);
          // Create temporary audio element to get duration
          const audio = new Audio(audioUrl ?? undefined);
          audio.addEventListener("loadedmetadata", () => {
            setAudioDuration(audio.duration);
          });

          toast({
            title: "Recording uploaded successfully",
          });
        } catch (error) {
          toast({
            title: "Error uploading recording",
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
        }
        resolve();
      };

      mediaRecorderRef.current!.stop();
      setIsRecording(false);
      mediaRecorderRef
        .current!.stream.getTracks()
        .forEach((track) => track.stop());
    });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        className={`relative w-full overflow-hidden py-8 text-16 font-extrabold ${
          isRecording
            ? "animate-pulse bg-red-500 text-white hover:bg-red-600"
            : "bg-orange-1 text-white-1 hover:bg-orange-1/90"
        } ${isUploading ? "opacity-50" : ""}`}
        disabled={isUploading}
      >
        <div className="flex items-center justify-center gap-2">
          {isUploading ? (
            <>
              <Loader size={24} className="animate-spin" />
              <span>Uploading Recording...</span>
            </>
          ) : isRecording ? (
            <>
              <Square size={24} className="animate-pulse" />
              <span>Stop Recording</span>
            </>
          ) : (
            <>
              <Mic size={24} />
              <span>Start Recording</span>
            </>
          )}
        </div>
      </Button>
      {isRecording && (
        <div className="flex items-center gap-2 text-red-500">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-medium">Recording in progress...</span>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
