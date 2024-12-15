"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import GeneratePodcast from "@/components/GeneratePodcast";
import GenerateThumbnail from "@/components/GenerateThumbnail";
import { Loader } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  podcastTitle: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  podcastDescription: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
});

const CreatePodcast = () => {

  const router=useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false);
    
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | null>(null)
  const [imageUrl, setImageUrl] = useState('');
    
  const [audioUrl, setAudioUrl] = useState('');
  const [audioStorageId, setAudioStorageId] = useState<Id<"_storage"> | null>(null)
  const [audioDuration, setAudioDuration] = useState(0);
    
  const [voiceType, setVoiceType] = useState<string | null>(null);
  const [voicePrompt, setVoicePrompt] = useState('');
  const { toast } = useToast()
  
  const createPodcast=useMutation(api.podcasts.createPodcast)
    
  // ...
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        podcastTitle: "",
        podcastDescription: "",
       
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(data: z.infer<typeof formSchema>) {
       try {
         setIsSubmitting(true);
         if (!audioUrl || !imageUrl || !voiceType) {
           toast({
             title: "Please provide audio and image and voice type to generate a podcast",
             variant:"destructive",
           })
           throw new Error("Please generate an audio and image first");

         }
        const podcast= await createPodcast({
            podcastTitle: data.podcastTitle,
            podcastDescription: data.podcastDescription,
            audioUrl,
            imageUrl,
           voiceType,
            imagePrompt,
           voicePrompt,
           views: 0,
           audioDuration,
           audioStorageId: audioStorageId!,
            imageStorageId: imageStorageId!,
        })
         toast({ title: "podcast created" })
         setIsSubmitting(false)
         router.push('/')
         
       } catch (error) {
         console.log(error);
        //  toast({
        //     title: "Error creating podcast",
        //     variant:"destructive",
        //  })
         setIsSubmitting(false);
       }
    }
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
      ];;
  

  return (
    <section className="mt-10 flex flex-col">
      <h1 className="text-20 font-bold text-white-1"> Create Podcast</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mt-12 flex w-full flex-col"
        >
          <div className="flex flex-col gap-[30px] border-b border-black-5 pb-10">
            <FormField
              control={form.control}
              name="podcastTitle"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2.5 ">
                  <FormLabel className="text-16 font-bold text-white-1">
                    Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="input-class focus-visible:ring-offset-orange-1"
                      placeholder="Podcast"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage className="text-white-1" />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-2.5">
              <Label className="text-16 font-bold text-white-1">
                Select AI Voice
              </Label>
              <Select onValueChange={(value)=>setVoiceType(value)}>
                <SelectTrigger
                  className={cn(
                    "text-16 w-full border-none bg-black-1 text-gray-1 focus-visible:ring-offset-orange-1"
                  )}
                >
                  <SelectValue
                    placeholder="Select AI Voice"
                    className="placeholder:text-gray-1"
                  />
                </SelectTrigger>
                <SelectContent className="text-16 border-none bg-black-1 font-bold text-white-1 focus:ring-orange-1">
                  {voiceCategory.map((category) => (
                    <SelectItem
                      key={category.name}
                      value={category.id}
                      className="capitalize focus:bg-orange-1"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
                {/* {voiceType && (
                  <audio
                    src={`/${voiceType}.mp3`}
                    autoPlay
                    className="hidden"
                  />
                )} */}
              </Select>
                      </div>
                      <FormField
              control={form.control}
              name="podcastDescription"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2.5 ">
                  <FormLabel className="text-16 font-bold text-white-1">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="input-class focus-visible:ring-offset-orange-1"
                      placeholder="Write a Short Podcast Description"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage className="text-white-1" />
                </FormItem>
              )}
            />
                  </div>
                  <div className=" flex flex-col pt-10">
                      <GeneratePodcast
                          setAudioStorageId={setAudioStorageId!}
                          setAudio={setAudioUrl}
                          voiceType={voiceType!}
                          audio={audioUrl}
                          voicePrompt={voicePrompt}
                          setVoicePrompt={setVoicePrompt}
                          setAudioDuration={setAudioDuration}
                      />
                     <GenerateThumbnail 
               setImage={setImageUrl}
               setImageStorageId={setImageStorageId}
               image={imageUrl}
               imagePrompt={imagePrompt}
               setImagePrompt={setImagePrompt}
              />

                      
                      <div className="mt-10 w-full">
                          <Button type="submit" className="text-16 w-full bg-orange-1 py-4 font-extrabold text-white-1 transition-all duration-500 hover:bg-black-1">
                              {isSubmitting ? <>
                                Submitting
                                  <Loader size={20} className="animate-spin ml-2" />
                                 
                              </>:("Submit & Publish Podcast")}</Button>
                      </div>
                  </div>
        </form>
          </Form>
         
    </section>
  );
};
export default CreatePodcast;
