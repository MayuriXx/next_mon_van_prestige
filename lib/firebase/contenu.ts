import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, doc, getDoc } from 'firebase/firestore';

export interface ServiceContent {
  id: string;
  name: string;
  description: string;
  icon: string;
  slug: string;
  position: number;
}

export interface VehicleContent {
  id: string;
  name: string;
  description: string;
  features: string[];
  position: number;
}

export interface SectionContent {
  title: string;
  description: string;
  imagePosition: 'left' | 'right';
}

// Récupérer tous les services
export async function getServices(): Promise<ServiceContent[]> {
  try {
    const servicesRef = collection(db, 'contenu', 'services', 'list');
    const q = query(servicesRef);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as ServiceContent))
      .sort((a, b) => a.position - b.position);
  } catch (error) {
    console.error('Error fetching services:', error);
    return [];
  }
}

// Récupérer tous les véhicules
export async function getVehicles(): Promise<VehicleContent[]> {
  try {
    const vehiclesRef = collection(db, 'contenu', 'vehicles', 'list');
    const q = query(vehiclesRef);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as VehicleContent))
      .sort((a, b) => a.position - b.position);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return [];
  }
}

// Récupérer contenu d'une section
export async function getSectionContent(sectionId: string): Promise<SectionContent | null> {
  try {
    const docRef = doc(db, 'contenu', 'sections', sectionId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as SectionContent) : null;
  } catch (error) {
    console.error(`Error fetching section ${sectionId}:`, error);
    return null;
  }
}
