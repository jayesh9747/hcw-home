import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { AvailabilityService, TimeSlot, Practitioner, CreateConsultationRequest } from '../../services/availability.service';
import { HttpClient } from '@angular/common/http';

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
  currentPatientId: number = 0;

  paymentCompleted = false;

  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private availabilityService: AvailabilityService,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {

    this.initializePatientId();
    
    const practitionerId = this.route.snapshot.paramMap.get('practitionerId');
    if (practitionerId) {
      this.loadPractitioner(parseInt(practitionerId));
    } else {
      this.router.navigate(['/home']);
    }
  }

  private initializePatientId() {
    let user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (user && user.id && user.role === 'PATIENT') {
      this.currentPatientId = user.id;
    } else {
      console.warn('No authenticated user found');
    }
  }

  async loadPractitioner(practitionerId: number) {
    this.loading = true;
    try {
      const response = await this.http.get<any>(`http://localhost:3000/api/v1/user/practitioners`).toPromise();
      const practitioners = response?.data || [];
      this.selectedPractitioner = practitioners.find((p: any) => p.id === practitionerId);
      if (this.selectedPractitioner) {
        this.generateSlotsForPractitioner();
      } else {
        console.error('Practitioner not found with ID:', practitionerId);
        this.showToast('Practitioner not found. Please try again.', 'danger');
      }
    } catch (error) {
      console.error('Error loading practitioner:', error);
      this.showToast('Error loading practitioner data. Please check your connection.', 'danger');
    } finally {
      this.loading = false;
    }
  }

  generateSlotsForPractitioner() {
    if (!this.selectedPractitioner) return;

    this.selectedDate = new Date().toISOString().split('T')[0];
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

    this.loadAvailableSlots();
  }

  async loadAvailableSlots() {
    if (!this.selectedPractitioner || !this.selectedDate) return;

    const loading = await this.loadingController.create({
      message: 'Loading available slots...',
    });
    await loading.present();

    try {
      const endDate = addDays(new Date(this.selectedDate), 1);
      
      this.availabilityService.getAvailableSlots(
        this.selectedPractitioner.id,
        this.selectedDate,
        endDate.toISOString().split('T')[0]
      ).subscribe({
        next: (response) => {
          const slots = response?.data || [];
          this.availableSlots = slots.filter((slot: any) => {
            const slotDate = new Date(slot.date).toISOString().split('T')[0];
            return slotDate === this.selectedDate;
          });
          loading.dismiss();
        },
        error: (error) => {
          console.error('Error loading slots:', error);
          this.showToast('Error loading available slots', 'danger');
          loading.dismiss();
        }
      });
    } catch (error) {
      console.error('Error loading slots:', error);
      this.showToast('Error loading available slots', 'danger');
      loading.dismiss();
    }
  }

  async confirmBooking() {
    const loading = await this.loadingController.create({
      message: 'Booking appointment...',
    });
    await loading.present();

    try {
      const bookingRequest: CreateConsultationRequest = {
        timeSlotId: this.selectedSlot!.id,
        patientId: this.currentPatientId,
      };

      this.availabilityService.createConsultationWithTimeSlot(bookingRequest).subscribe({
        next: (response) => {
          this.availableSlots = this.availableSlots.filter(
            (slot) => slot.id !== this.selectedSlot!.id
          );

          this.selectedSlot = null;
          this.notes = '';
          this.paymentCompleted = false;

          this.showToast('Appointment booked successfully!', 'success');
          loading.dismiss();
        },
        error: (error) => {
          console.error('Booking error:', error);
          this.showToast('Failed to book appointment. Please try again.', 'danger');
          loading.dismiss();
        }
      });
    } catch (error) {
      console.error('Booking error:', error);
      this.showToast('Failed to book appointment. Please try again.', 'danger');
      loading.dismiss();
    }
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

  getSlotDuration(): number {
    if (this.availableSlots.length > 0) {
      const slot = this.availableSlots[0];
      const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
      const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;
      return endTotalMinutes - startTotalMinutes;
    }
    return 0;
  }
}
