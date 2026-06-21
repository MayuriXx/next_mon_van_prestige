import styles from './VehiculesTarifsWrapper.module.css';
import Vehicles from './Vehicles';
import Tarifs from './Tarifs';

export default function VehiculesTarifsWrapper() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.overlay} />
      <div className={styles.content}>
        <Vehicles />
        <Tarifs />
      </div>
    </div>
  );
}
