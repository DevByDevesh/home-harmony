import { useState, type ReactNode } from "react";
import { Bath, BedDouble, Check, MapPin, Maximize2, Expand, ChevronLeft, ChevronRight } from "lucide-react";
import { displayPrice, type Home, type Listing } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Reveal } from "@/components/cinematic-motion";
import { PropertyIntelligence, PropertySectionNav } from "@/components/property-intelligence";

/** Shared property presentation used by the public detail page and the owner listing preview. */
export function PropertyDetailView({ home, listings, actions, aside, imageNote, disclaimer, images }: { home: Home; listings?: Listing[]; actions?: ReactNode; aside: ReactNode; imageNote: string; disclaimer: string; images?: string[] | undefined }) {
  const galleryImages = images?.length ? images : [home.image];
  const [activePhoto, setActivePhoto] = useState(0);
  const currentPhoto = galleryImages[Math.min(activePhoto, galleryImages.length - 1)] ?? home.image;

  const movePhoto = (direction: 1 | -1) => {
    setActivePhoto(current => (current + direction + galleryImages.length) % galleryImages.length);
  };

  return <>
    <PropertySectionNav home={home} />
    <div className="detail-heading"><div><p className="kicker">{home.mode === "Rent" ? "FOR RENT" : "FOR SALE"} / {home.kind.toUpperCase()}</p><h1>{home.name}<span className="peach-stop">.</span></h1><p><MapPin size={16}/>{home.neighborhood}, {home.city}</p></div>
      <div className="detail-price">{actions && <div className="detail-actions">{actions}</div>}<strong>{displayPrice(home)}</strong><span>{home.mode === "Rent" ? "per month" : "asking price"}</span></div></div>
    <div className="detail-image">
      <div className="detail-gallery">
        <div className="detail-gallery-photo">
          <img className="detail-gallery-photo-image" src={currentPhoto} alt={`Property view ${activePhoto + 1} of ${home.name}`} width={1600} height={1000} loading="eager" decoding="async" />
        </div>
        {galleryImages.length > 1 && <span className="detail-photo-count">{activePhoto + 1} / {galleryImages.length}</span>}
        <span>{imageNote}</span>
      </div>
      {galleryImages.length > 1 && <div className="detail-gallery-controls" aria-label="Property photo navigation">
        <button type="button" className="detail-gallery-control" aria-label="Previous photo" onClick={() => movePhoto(-1)}><ChevronLeft size={18}/> Previous</button>
        <span className="detail-gallery-control-count">Photo {activePhoto + 1} of {galleryImages.length}</span>
        <button type="button" className="detail-gallery-control" aria-label="Next photo" onClick={() => movePhoto(1)}>Next <ChevronRight size={18}/></button>
      </div>}
      {galleryImages.length > 1 && <div className="detail-thumbnails" aria-label="Property photos">{galleryImages.map((src, i) => <button key={`${src}-thumb-${i}`} type="button" className={`detail-thumbnail ${i === activePhoto ? "active" : ""}`} aria-label={`View photo ${i + 1}`} aria-current={i === activePhoto ? "true" : undefined} onClick={() => setActivePhoto(i)}><img src={src} alt="" width={120} height={90}/></button>)}</div>}
      <Dialog>
        <DialogTrigger asChild><Button variant="secondary" className="detail-expand"><Expand size={16}/> View photos</Button></DialogTrigger>
        <DialogContent className="photo-dialog">
          <DialogTitle>{home.name}</DialogTitle>
          <DialogDescription>{imageNote} · Photo {activePhoto + 1} of {galleryImages.length}</DialogDescription>
          <div className="photo-dialog-gallery">
            {galleryImages.length > 1 && <button type="button" className="photo-dialog-nav photo-dialog-prev" aria-label="Previous photo" onClick={() => movePhoto(-1)}><ChevronLeft size={24}/></button>}
            <img src={currentPhoto} alt={`Property view ${activePhoto + 1} of ${home.name}`} width={1008} height={768}/>
            {galleryImages.length > 1 && <button type="button" className="photo-dialog-nav photo-dialog-next" aria-label="Next photo" onClick={() => movePhoto(1)}><ChevronRight size={24}/></button>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    <div className="detail-layout"><div>
      <div id="details" className="fact-row"><span><BedDouble size={22}/><strong>{home.beds}</strong> Bedrooms</span><span><Bath size={22}/><strong>{home.baths}</strong> Bathrooms</span><span><Maximize2 size={22}/><strong>{home.area.toLocaleString("en-IN")}</strong> sq.ft.</span></div>
      <Reveal><section id="overview" className="detail-block"><p className="kicker">THE SPACE</p><h2>A closer look.</h2><p>{home.description}</p><p className="disclaimer">{disclaimer}</p></section></Reveal>
      <Reveal><section id="amenities" className="detail-block"><p className="kicker">WHAT’S INCLUDED</p><h2>The everyday details.</h2><div className="features-grid">{[home.furnishing, ...home.features].map(feature => <span key={feature}><Check size={17}/>{feature}</span>)}</div></section></Reveal>
    </div><aside className="detail-aside">{aside}</aside></div>
    <PropertyIntelligence home={home} listings={listings ?? []} />
  </>;
}


