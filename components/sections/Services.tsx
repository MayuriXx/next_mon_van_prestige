'use client';

import { useEffect, useState } from 'react';
import { getServices, type ServiceContent } from '@/lib/firebase/contenu';
import styles from './Services.module.css';

export default function Services() {
  const [services, setServices] = useState<ServiceContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
      const data = await getServices();
      setServices(data);
      setLoading(false);
    }
    loadServices();
  }, []);

  if (loading) {
    return <section className={styles.section} />;
  }

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.grid}>
          {services.map((service) => (
            <div key={service.id} className={styles.serviceItem}>
              <div className={styles.icon}>{service.icon}</div>
              <div className={styles.info}>
                <h3 className={styles.name}>{service.name}</h3>
                <p className={styles.description}>{service.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
