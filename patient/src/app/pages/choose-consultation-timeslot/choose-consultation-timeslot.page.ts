import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { format, addDays } from 'date-fns';
import {
  IonContent,
  IonDatetime,
  IonIcon,
  IonLabel,
  IonItem,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonCardContent,
  IonCard,
  IonChip,
  IonCardSubtitle,
  IonAvatar,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from 'src/app/components/header/header.component';

interface Practitioner {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  specialization?: string;
  defaultSlotDuration: number;
}

interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  date: string;
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED';
}

interface BookingRequest {
  timeSlotId: number;
  patientId: number;
  notes?: string;
}

@Component({
  selector: 'app-choose-consultation-timeslot',
  templateUrl: './choose-consultation-timeslot.page.html',
  styleUrls: ['./choose-consultation-timeslot.page.scss'],
  standalone: true,
  imports: [
    HeaderComponent,
    IonContent,
    CommonModule,
    FormsModule,
    IonDatetime,
    IonIcon,
    IonLabel,
    IonItem,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonCardContent,
    IonCard,
    IonChip,
    IonCardSubtitle,
    IonAvatar,
  ],
})
export class ChooseConsultationTimeslotPage implements OnInit {
  practitioners: Practitioner[] = [];
  selectedPractitioner: Practitioner | null = null;
  selectedDate: string = '';
  availableSlots: TimeSlot[] = [];
  selectedSlot: TimeSlot | null = null;
  loading = false;
  notes = '';
  currentPatientId = 1;

  paymentCompleted = false;

  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.selectedPractitioner = {
      id: 2,
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@example.com',
      specialization: 'Dermatology',
      defaultSlotDuration: 15,
    };
    this.loadAvailableSlots();
  }

  onPractitionerChange() {
    this.selectedSlot = null;
    this.availableSlots = [];
    if (this.selectedPractitioner && this.selectedDate) {
      this.loadAvailableSlots();
    }
  }

  onDateChange() {
    this.selectedSlot = null;
    this.availableSlots = [];
    this.paymentCompleted = false;

    if (!this.selectedPractitioner || !this.selectedDate) return;

    const selected = new Date(this.selectedDate);
    const day = selected.getDay();

    if (
      this.selectedPractitioner.firstName === 'Dr. Sarah' &&
      (day === 0 || day === 3)
    ) {
      this.showToast(
        'Dr. Sarah is unavailable on Sundays and Wednesdays.',
        'warning'
      );
      this.selectedDate = '';
      return;
    }

    this.loadAvailableSlots();
  }

  async loadAvailableSlots() {
    if (!this.selectedPractitioner || !this.selectedDate) return;

    const loading = await this.loadingController.create({
      message: 'Loading available slots...',
      duration: 2000,
    });
    await loading.present();

    try {
      await this.delay(1000);
      const selected = new Date(this.selectedDate);
      const day = selected.getDay();

      if (
        this.selectedPractitioner.firstName === 'Dr. Sarah' &&
        (day === 0 || day === 3)
      ) {
        this.availableSlots = [];
      } else {
        this.availableSlots = this.generateMockSlots();
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      this.showToast('Error loading available slots', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  private generateMockSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const duration = this.selectedPractitioner?.defaultSlotDuration || 20;
    let slotId = 1;

    const morningSlots = this.generateSlotsForRange('09:00', '12:00', duration, slotId);
    slotId += morningSlots.length;

    const afternoonSlots = this.generateSlotsForRange('14:00', '17:00', duration, slotId);
    slotId += afternoonSlots.length;

    slots.push(...morningSlots, ...afternoonSlots);

    const bookedIndices = [2, 5, 8, 12];
    bookedIndices.forEach((index) => {
      if (slots[index]) {
        slots[index].status = 'BOOKED';
      }
    });

    return slots.filter((slot) => slot.status === 'AVAILABLE');
  }

  private generateSlotsForRange(
    startTime: string,
    endTime: string,
    duration: number,
    startId: number
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTimeMinutes = endHour * 60 + endMin;
    let slotId = startId;

    while (currentTime + duration <= endTimeMinutes) {
      const startHours = Math.floor(currentTime / 60);
      const startMinutes = currentTime % 60;
      const endTimeSlot = currentTime + duration;
      const endHours = Math.floor(endTimeSlot / 60);
      const endMinutesSlot = endTimeSlot % 60;

      slots.push({
        id: slotId++,
        startTime: `${startHours.toString().padStart(2, '0')}:${startMinutes
          .toString()
          .padStart(2, '0')}`,
        endTime: `${endHours.toString().padStart(2, '0')}:${endMinutesSlot
          .toString()
          .padStart(2, '0')}`,
        date: this.selectedDate,
        status: 'AVAILABLE',
      });

      currentTime += duration;
    }

    return slots;
  }

  selectSlot(slot: TimeSlot) {
    this.selectedSlot = slot;
    this.paymentCompleted = false;
  }

  async proceedToPayment() {
    const loading = await this.loadingController.create({
      message: 'Processing payment...',
      duration: 3000,
    });
    await loading.present();

    try {
      await this.delay(2000);
      this.paymentCompleted = true;
      this.showToast('Payment successful!', 'success');
    } catch (error) {
      console.error('Payment error:', error);
      this.showToast('Payment failed. Please try again.', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async bookAppointment() {
    if (!this.selectedSlot || !this.selectedPractitioner) {
      this.showToast('Please select a time slot', 'warning');
      return;
    }

    if (!this.paymentCompleted) {
      this.showToast('Please complete the payment first.', 'warning');
      return;
    }

    this.confirmBooking();
  }

  async confirmBooking() {
    const loading = await this.loadingController.create({
      message: 'Booking appointment...',
      duration: 3000,
    });
    await loading.present();

    try {
      const bookingRequest: BookingRequest = {
        timeSlotId: this.selectedSlot!.id,
        patientId: this.currentPatientId,
        notes: this.notes,
      };

      await this.delay(2000);
      console.log('Booking request:', bookingRequest);

      this.availableSlots = this.availableSlots.filter(
        (slot) => slot.id !== this.selectedSlot!.id
      );

      this.selectedSlot = null;
      this.notes = '';
      this.paymentCompleted = false;

      this.showToast('Appointment booked successfully!', 'success');
    } catch (error) {
      console.error('Booking error:', error);
      this.showToast('Failed to book appointment. Please try again.', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    toast.present();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  formatDate(dateString: string): string {
    return format(new Date(dateString), 'EEEE, MMMM dd, yyyy');
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getMinDate(): string {
    return format(new Date(), 'yyyy-MM-dd');
  }

  getMaxDate(): string {
    const maxDate = addDays(new Date(), 30);
    return format(maxDate, 'yyyy-MM-dd');
  }
}
