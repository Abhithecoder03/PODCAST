import React, { useState, useRef } from "react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Loader, Upload } from "lucide-react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { v4 as uuidv4 } from "uuid";
import { useUploadFiles } from "@xixixao/uploadstuff/react";
import { useToast } from "@/components/ui/use-toast";
import VoiceRecorder from "./VoiceRecorder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

interface GeneratePodcastProps {
  setAudioStorageId: (id: Id<"_storage">) => void;
  setAudio: (url: string) => void;
  audio: string;
  voicePrompt: string;
  setVoicePrompt: (prompt: string) => void;
  setAudioDuration: (duration: number) => void;
}

// Add this type for Polly voices
type PollyVoice = {
  id: string;
  name: string;
  gender: string;
  language: string;
};

const pollyVoices: PollyVoice[] = [
  { id: "Joanna", name: "Joanna", gender: "Female", language: "US English" },
  { id: "Matthew", name: "Matthew", gender: "Male", language: "US English" },
  {
    id: "Stephen",
    name: "Stephen",
    gender: "Male",
    language: "British English",
  },
  { id: "Emma", name: "Emma", gender: "Female", language: "British English" },
  { id: "Amy", name: "Amy", gender: "Female", language: "British English" },
  { id: "Brian", name: "Brian", gender: "Male", language: "British English" },
  {
    id: "Olivia",
    name: "Olivia",
    gender: "Female",
    language: "Australian English",
  },
  {
    id: "Aria",
    name: "Aria",
    gender: "Female",
    language: "New Zealand English",
  },
  {
    id: "Ayanda",
    name: "Ayanda",
    gender: "Female",
    language: "South African English",
  },
  { id: "Justin", name: "Justin", gender: "Male", language: "US English" },
  { id: "Kendra", name: "Kendra", gender: "Female", language: "US English" },
  { id: "Kevin", name: "Kevin", gender: "Male", language: "US English" },
];

const useGeneratePodcast = (props: GeneratePodcastProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [selectedPollyVoice, setSelectedPollyVoice] =
    useState<string>("Joanna");

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const { startUpload } = useUploadFiles(generateUploadUrl);
  const getAudioUrl = useMutation(api.podcasts.getUrl);
  const getPodcastAudio = useAction(api.openai.generateAudioAction);

  const generatePodcast = async () => {
    setIsGenerating(true);
    props.setAudio("");

    if (!props.voicePrompt || !selectedVoiceId) {
      toast({
        title: "Please provide both a voice type and prompt",
      });
      return setIsGenerating(false);
    }

    try {
      const response = await getPodcastAudio({
        voice: selectedVoiceId,
        input: props.voicePrompt,
      });

      const blob = new Blob([response], { type: "audio/mpeg" });
      const fileName = `podcast-${uuidv4()}.mp3`;
      const file = new File([blob], fileName, { type: "audio/mpeg" });
      const uploaded = await startUpload([file]);
      const storageId = (uploaded[0].response as any).storageId;

      props.setAudioStorageId(storageId);
      const audioUrl = await getAudioUrl({ storageId });
      props.setAudio(audioUrl!);

      toast({
        title: "Podcast Audio Generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error generating podcast audio",
        variant: "destructive",
      });
      console.error("Error generating podcast audio", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFreeTTS = async (text: string) => {
    if (!text.trim() || !selectedPollyVoice) {
      toast({
        title: "Please provide both text and select a voice",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const wordCount = text.split(/\s+/).length;

      // Show initial toast for long text
      let toastId;
      if (wordCount > 500) {
        toastId = toast({
          title: "Processing long text",
          description: "This might take a few moments...",
          duration: 10000,
        });
      }

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voiceId: selectedPollyVoice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate speech");
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        throw new Error("Generated audio is empty");
      }

      const fileName = `tts-${uuidv4()}.mp3`;
      const file = new File([audioBlob], fileName, { type: "audio/mpeg" });

      // Upload the audio file
      const uploaded = await startUpload([file]);
      const storageId = (uploaded[0].response as any).storageId;
      props.setAudioStorageId(storageId);

      const audioUrl = await getAudioUrl({ storageId });
      if (!audioUrl) {
        throw new Error("Failed to get audio URL");
      }

      props.setAudio(audioUrl);

      // Verify audio can be played
      const audio = new Audio(audioUrl);
      await new Promise((resolve, reject) => {
        audio.addEventListener("loadedmetadata", () => {
          props.setAudioDuration(audio.duration);
          resolve(true);
        });
        audio.addEventListener("error", (e) => reject(e));
      });

      toast({
        title: "AWS Polly TTS Generated successfully",
        description:
          wordCount > 500 ? "Long text processed successfully" : undefined,
      });
    } catch (error) {
      console.error("Error in AWS Polly TTS generation:", error);
      toast({
        title: "Error generating TTS",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generatePodcast,
    selectedVoiceId,
    setSelectedVoiceId,
    generateFreeTTS,
    selectedPollyVoice,
    setSelectedPollyVoice,
  };
};

const GeneratePodcast = (props: GeneratePodcastProps) => {
  const [voiceMethod, setVoiceMethod] = useState<
    "ai" | "record" | "upload" | "free-tts" | null
  >(null);
  const {
    isGenerating,
    generatePodcast,
    selectedVoiceId,
    setSelectedVoiceId,
    generateFreeTTS,
    selectedPollyVoice,
    setSelectedPollyVoice,
  } = useGeneratePodcast(props);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const { startUpload } = useUploadFiles(generateUploadUrl);
  const getAudioUrl = useMutation(api.podcasts.getUrl);

  const voiceCategory = [
    { name: "Adam", id: "pNInz6obpgDQGcFmaJgB" },
    { name: "Alice", id: "Xb7hH8MSUJpSbSDYk0k2" },
    { name: "Antoni", id: "ErXwobaYiN019PkySvjV" },
    { name: "Arnold", id: "VR6AewLTigWG4xSOukaG" },
    { name: "Bill", id: "pqHfZKP75CvOlQylNhV4" },
    { name: "Brian", id: "nPczCjzI2devNBz1zQrb" },
    { name: "Callum", id: "N2lVS1w4EtoT3dr4eOWO" },
    { name: "Charlie", id: "IKne3meq5aSn9XLyUdCD" },
    { name: "Charlotte", id: "XB0fDUnXU5powFXDhCwa" },
    { name: "Chris", id: "iP95p4xoKVk53GoZ742B" },
    { name: "Clyde", id: "2EiwWnXFnvU5JabPnv8n" },
    { name: "Daniel", id: "onwK4e9ZLuTAKqWW03F9" },
  ] as const;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploaded = await startUpload([file]);
      const storageId = (uploaded[0].response as any).storageId;
      props.setAudioStorageId(storageId);
      const audioUrl = await getAudioUrl({ storageId });
      if (audioUrl) {
        props.setAudio(audioUrl);

        const audio = new Audio(audioUrl);
        audio.addEventListener("loadedmetadata", () => {
          props.setAudioDuration(audio.duration);
        });
      }

      toast({
        title: "Audio file uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error uploading audio file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4">
        <Label className="text-16 font-bold text-white-1">
          Choose Voice Generation Method
        </Label>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Button
            type="button"
            className={cn("py-6 text-16 font-bold", {
              "bg-orange-1 text-white-1": voiceMethod === "ai",
              "bg-black-1 text-gray-1 hover:bg-orange-1/10":
                voiceMethod !== "ai",
            })}
            onClick={() => setVoiceMethod("ai")}
          >
            OpenAI TTS
          </Button>
          <Button
            type="button"
            className={cn("py-6 text-16 font-bold", {
              "bg-orange-1 text-white-1": voiceMethod === "free-tts",
              "bg-black-1 text-gray-1 hover:bg-orange-1/10":
                voiceMethod !== "free-tts",
            })}
            onClick={() => setVoiceMethod("free-tts")}
          >
            Free TTS
          </Button>
          <Button
            type="button"
            className={cn("py-6 text-16 font-bold", {
              "bg-orange-1 text-white-1": voiceMethod === "record",
              "bg-black-1 text-gray-1 hover:bg-orange-1/10":
                voiceMethod !== "record",
            })}
            onClick={() => setVoiceMethod("record")}
          >
            Record Voice
          </Button>
          <Button
            type="button"
            className={cn("py-6 text-16 font-bold", {
              "bg-orange-1 text-white-1": voiceMethod === "upload",
              "bg-black-1 text-gray-1 hover:bg-orange-1/10":
                voiceMethod !== "upload",
            })}
            onClick={() => setVoiceMethod("upload")}
          >
            Upload Audio
          </Button>
        </div>
      </div>

      {voiceMethod === "upload" && (
        <div className="mt-8">
          <Label className="text-16 font-bold text-white-1">
            Upload Audio File
          </Label>
          <div
            className={cn(
              "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-1 p-6",
              {
                "opacity-50": isUploading,
              }
            )}
            onClick={() => !isUploading && audioFileRef.current?.click()}
          >
            <input
              type="file"
              ref={audioFileRef}
              className="hidden"
              accept="audio/*"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="flex items-center gap-2">
                <Loader className="animate-spin" />
                <span>Uploading...</span>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-gray-1" />
                <p className="mt-2 text-sm text-gray-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-1">MP3, WAV, M4A (max. 10MB)</p>
              </>
            )}
          </div>
        </div>
      )}

      {voiceMethod === "free-tts" && (
        <div className="mt-8 flex flex-col gap-2.5">
          <Label className="text-16 font-bold text-white-1">
            Select AWS Polly Voice
          </Label>
          <Select
            value={selectedPollyVoice}
            onValueChange={setSelectedPollyVoice}
          >
            <SelectTrigger className="bg-black-1 text-gray-1">
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent className="bg-black-1 text-gray-1">
              {pollyVoices.map((voice) => (
                <SelectItem
                  key={voice.id}
                  value={voice.id}
                  className="capitalize focus:bg-orange-1"
                >
                  {voice.name} ({voice.gender} - {voice.language})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label className="text-16 font-bold text-white-1">
            Text to Speech Content
          </Label>
          <Textarea
            className="input-class font-light focus-visible:ring-offset-orange-1"
            placeholder="Write what you want AWS Polly to say..."
            rows={5}
            value={props.voicePrompt}
            onChange={(e) => props.setVoicePrompt(e.target.value)}
            disabled={isGenerating}
          />
          <Button
            type="button"
            className="mt-4 bg-orange-1 py-4 text-16 font-extrabold text-white-1"
            onClick={() => generateFreeTTS(props.voicePrompt)}
            disabled={isGenerating || !props.voicePrompt || !selectedPollyVoice}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <Loader className="animate-spin" />
                <span>
                  Generating with{" "}
                  {pollyVoices.find((v) => v.id === selectedPollyVoice)?.name}
                </span>
              </div>
            ) : (
              "Generate AWS Polly Voice"
            )}
          </Button>
        </div>
      )}

      {voiceMethod === "ai" && (
        <div className="mt-8 flex flex-col gap-2.5">
          <Label className="text-16 font-bold text-white-1">
            Select AI Voice
          </Label>
          <Select onValueChange={setSelectedVoiceId} value={selectedVoiceId}>
            <SelectTrigger className="bg-black-1 text-gray-1">
              <SelectValue placeholder="Select a voice type" />
            </SelectTrigger>
            <SelectContent className="bg-black-1 text-gray-1">
              {voiceCategory.map((voice) => (
                <SelectItem
                  key={voice.id}
                  value={voice.id}
                  className="capitalize focus:bg-orange-1"
                >
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label className="text-16 font-bold text-white-1">
            AI Prompt to generate Podcast
          </Label>
          <Textarea
            className="input-class font-light focus-visible:ring-offset-orange-1"
            placeholder="Write what you want the AI to say..."
            rows={5}
            value={props.voicePrompt}
            onChange={(e) => props.setVoicePrompt(e.target.value)}
            disabled={isGenerating}
          />
          <Button
            type="button"
            className="mt-4 bg-orange-1 py-4 text-16 font-extrabold text-white-1"
            onClick={generatePodcast}
            disabled={isGenerating || !props.voicePrompt || !selectedVoiceId}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <Loader className="animate-spin" />
                <span>Generating...</span>
              </div>
            ) : (
              "Generate AI Voice"
            )}
          </Button>
        </div>
      )}

      {voiceMethod === "record" && (
        <div className="mt-8">
          <Label className="text-16 font-bold text-white-1">
            Record Your Voice
          </Label>
          <div className="mt-4">
            <VoiceRecorder
              setAudioStorageId={props.setAudioStorageId}
              setAudio={props.setAudio}
              setAudioDuration={props.setAudioDuration}
            />
          </div>
        </div>
      )}

      {props.audio && (
        <div className="mt-8">
          <Label className="mb-2 block text-16 font-bold text-white-1">
            Preview Audio
          </Label>
          <audio
            controls
            className="w-full rounded-lg bg-black-1"
            onLoadedMetadata={(e) =>
              props.setAudioDuration(e.currentTarget.duration)
            }
            src={props.audio}
          />
        </div>
      )}
    </div>
  );
};

export default GeneratePodcast;
