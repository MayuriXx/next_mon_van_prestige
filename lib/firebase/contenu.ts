import { db } from '@/lib/firebase/client';
import { collection, getDocs, query } from 'firebase/firestore';
import { servicesData } from '@/lib/data/services';
import { vehiclesData } from '@/lib/data/vehicles';

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

// Récupérer tous les services
export async function getServices(): Promise<ServiceContent[]> {
  try {
    // Essayer Firestore d'abord
    const servicesRef = collection(db, 'services');
    const q = query(servicesRef);
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.docs.length > 0) {
      return querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as ServiceContent))
        .sort((a, b) => (a.position || 0) - (b.position || 0));
    }
  } catch (error) {
    console.log('Firestore unavailable for services, using local data');
  }
  
  // Fallback: données locales
  return servicesData;
}

// Récupérer tous les véhicules
export async function getVehicles(): Promise<VehicleContent[]> {
  try {
    // Essayer Firestore d'abord
    const vehiclesRef = collection(db, 'vehicles');
    const q = query(vehiclesRef);
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.docs.length > 0) {
      return querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as VehicleContent))
        .sort((a, b) => (a.position || 0) - (b.position || 0));
    }
  } catch (error) {
    console.log('Firestore unavailable for vehicles, using local data');
  }
  
  // Fallback: données locales
  return vehiclesData;
}

