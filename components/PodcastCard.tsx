import React from 'react'
import Image from 'next/image'
import { PodcastCardProps } from '@/types'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { toast } from './ui/use-toast'
const PodcastCard = ({ imgUrl, title, description, podcastId }: PodcastCardProps) => {
  const router = useRouter()
  const increaseView=useMutation(api.podcasts.updatePodcastViews)
  const handleView = async() => {
    //increase view
    try {
      await increaseView({ podcastId });
      toast({
        title: "Podcast View Updated",
      });
     
    } catch (error) {
      console.error("Error updating podcast view", error);
      toast({
        title: "Error updating  podcast view",
        variant: "destructive",
      });
    }
    //route to details page
    router.push(`/podcasts/${podcastId}`, {
      scroll: true
    })
  }
  return (
    <div className='cursor-pointer' onClick={handleView}>
      <figure className='flex flex-col gap-2 justify-center items-center text-center'>
        <Image src={imgUrl} width={174} height={174} alt={title} className='aspect-square  rounded-xl 2xl:size-[200px]'/>
        <div className='flex flex-col'>
          <h1 className='text-16 truncate font-bold text-white-1'>{title}</h1>
          <h2 className='text-white-4 text-12 truncate '>{ description.slice(0,30)}...</h2>
        </div>
      </figure>
      
    </div>
  )
}

export default PodcastCard
