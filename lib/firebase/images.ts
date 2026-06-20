import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';

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
    const docRef = doc(db, 'images', 'hero');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as ImageData) : null;
  } catch (error) {
    console.error('Error fetching hero image:', error);
    return null;
  }
}

// Récupérer les images des véhicules
export async function getVehicleImages(): Promise<VehicleImage[]> {
  try {
    const vehiclesRef = collection(db, 'images', 'vehicles', 'all');
    const q = query(vehiclesRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map((doc) => ({
        name: doc.id,
        ...doc.data(),
      } as VehicleImage))
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  } catch (error) {
    console.error('Error fetching vehicle images:', error);
    return [];
  }
}

// Récupérer les images des sections
export async function getSectionImages(section: string): Promise<ImageData | null> {
  try {
    const docRef = doc(db, 'images', 'sections', section);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as ImageData) : null;
  } catch (error) {
    console.error(`Error fetching ${section} image:`, error);
    return null;
  }
}
