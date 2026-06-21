import Hero from '@/components/sections/Hero';
import Features from '@/components/sections/Features';
import VehiculesTarifsWrapper from '@/components/sections/VehiculesTarifsWrapper';
import ServiceSection from '@/components/sections/ServiceSection';
import About from '@/components/sections/About';

const SECTIONS = [
  { id: 'transfert-aeroport', slug: 'transfert-aeroport' },
  { id: 'transfert-simple', slug: 'transfert-simple' },
  { id: 'mise-a-disposition', slug: 'mise-a-disposition' },
  { id: 'evenements-speciaux', slug: 'evenements-speciaux' },
  { id: 'escapades-loisirs', slug: 'escapades-loisirs' },
  { id: 'deplacements-professionnels', slug: 'deplacements-professionnels' },
];

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <VehiculesTarifsWrapper />
      {SECTIONS.map((section) => (
        <ServiceSection
          key={section.id}
          sectionId={section.id}
          slug={section.slug}
        />
      ))}
      <About />
    </>
  );
}
