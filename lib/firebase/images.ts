import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { imagesData } from '@/lib/data/images';

export interface ImageData {
  url: string;
  alt: string;
  position?: number;
}

export interface VehicleImage extends ImageData {
  name: string;
}

// Récupérer l'image hero
export async function getHeroImage(): Promise<ImageData | null> {
  try {
    // Essayer Firestore d'abord
    const docRef = doc(db, 'images', 'hero');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as ImageData;
    }
  } catch (error) {
    console.log('Firestore unavailable for hero image, using local data');
  }
  
  // Fallback: données locales
  return imagesData.hero;
}

// Récupérer les images des véhicules
export async function getVehicleImages(): Promise<VehicleImage[]> {
  try {
    // Essayer Firestore d'abord
    const vehiclesRef = collection(db, 'vehicle_images');
    const q = query(vehiclesRef);
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.docs.length > 0) {
      return querySnapshot.docs
        .map((doc) => ({
          name: doc.id,
          ...doc.data(),
        } as VehicleImage))
        .sort((a, b) => (a.position || 0) - (b.position || 0));
    }
  } catch (error) {
    console.log('Firestore unavailable for vehicle images, using local data');
  }
  
  // Fallback: données locales
  return Object.entries(imagesData.vehicles).map(([id, data]) => ({
    name: id,
    ...data,
  }));
}

// Récupérer les images des sections
export async function getSectionImages(section: string): Promise<ImageData | null> {
  try {
    // Essayer Firestore d'abord
    const docRef = doc(db, 'section_images', section);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as ImageData;
    }
  } catch (error) {
    console.log(`Firestore unavailable for ${section} image, using local data`);
  }
  
  // Fallback: données locales
  return imagesData.sections[section] || null;
}
