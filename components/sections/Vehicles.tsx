'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getVehicles, type VehicleContent } from '@/lib/firebase/contenu';
import { getVehicleImages, type VehicleImage } from '@/lib/firebase/images';
import styles from './Vehicles.module.css';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<VehicleContent[]>([]);
  const [images, setImages] = useState<Record<string, VehicleImage>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVehicles() {
      const vehiclesData = await getVehicles();
      const imagesData = await getVehicleImages();
      
      const imageMap: Record<string, VehicleImage> = {};
      imagesData.forEach((img) => {
        imageMap[img.name] = img;
      });
      
      setVehicles(vehiclesData);
      setImages(imageMap);
      setLoading(false);
    }
    loadVehicles();
  }, []);

  if (loading) {
    return <section className={styles.section} />;
  }

  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>NOS VÉHICULES</h2>
        
        <div className={styles.grid}>
          {vehicles.map((vehicle) => {
            const image = images[vehicle.id];
            return (
              <div key={vehicle.id} className={styles.card}>
                <div className={styles.imageWrapper}>
                  {image ? (
                    <Image
                      src={image.url}
                      alt={image.alt || vehicle.name}
                      fill
                      className={styles.image}
                    />
                  ) : (
                    <div className={styles.imagePlaceholder}>No image</div>
                  )}
                </div>
                
                <div className={styles.content}>
                  <h3 className={styles.name}>{vehicle.name}</h3>
                  <p className={styles.description}>{vehicle.description}</p>
                  
                  <div className={styles.features}>
                    {vehicle.features?.map((feature, idx) => (
                      <span key={idx} className={styles.feature}>
                        {feature}
                      </span>
                    ))}
                  </div>
                  
                  <button className={styles.cta}>À partir de XXX€</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
