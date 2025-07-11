import { FormsModule } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { 
  ToastController,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonContent, 
  IonItem, IonLabel, IonButton,
  IonCol,
  IonRow,
  IonGrid,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  paperPlaneOutline, 
  createOutline, 
  trashOutline 
} from 'ionicons/icons';


interface Consultation {
  id: number;
  patientName: string;
  age: number;
  groupOrSpecialty: string;
  selectedSpecialtyId?: number;
  selectedPractitionerId?: number;
  symptoms: string;
  status: 'draft' | 'assigned' | 'completed';
  createdAt: Date;
}

interface Specialty {
  id: number;
  name: string;
}

interface Practitioner {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  specialities: any[];
}
@Component({
  selector: 'app-tab2',
  templateUrl: 'consultation-request.page.html',
  styleUrls: ['consultation-request.page.scss'],
  standalone: true,
  imports: [
    HeaderComponent,
    IonCol,
    IonRow,
    IonGrid,
    CommonModule,
    FormsModule,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonItem,
    IonLabel,
    IonContent,
    IonIcon,
  ],
})
export class ConsultationRequestPage implements OnInit {
  specialties: Specialty[] = [];
  practitioners: Practitioner[] = [];
  filteredPractitioners: Practitioner[] = [];
  
  consultation: Partial<Consultation> = {
    status: 'draft'
  };

  draftConsultations: Consultation[] = [];
  nextId = 1;
  loading = false;

  constructor(
    private router: Router, 
    private toastController: ToastController,
    private http: HttpClient
  ) {
    // Add Ionicons
    addIcons({
      'paper-plane-outline': paperPlaneOutline,
      'create-outline': createOutline,
      'trash-outline': trashOutline
    }); 
  }
  
  ngOnInit() {
    this.loadSpecialties();
    this.loadPractitioners();
  }

  submitRequest() {
    if (
      !this.consultation.selectedSpecialtyId || 
      !this.consultation.selectedPractitionerId
    ) {
      // Show validation error
      this.showDetailsfillError("Please select specialty and practitioner");
      return;
    }

    this.router.navigate(['/choose-consultation-timeslot', this.consultation.selectedPractitionerId]);
  }

  async loadSpecialties() {
    try {
      this.loading = true;
      const response = await this.http.get<any>('http://localhost:3000/api/v1/speciality').toPromise();
      this.specialties = response?.data || [];
    } catch (error) {
      console.error('Error loading specialties:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadPractitioners() {
    try {
      const response = await this.http.get<any>('http://localhost:3000/api/v1/user/practitioners').toPromise();
      this.practitioners = response?.data || [];
    } catch (error) {
      console.error('Error loading practitioners:', error);
    }
  }

  onSpecialtyChange() {
    if (this.consultation.selectedSpecialtyId) {
      this.filteredPractitioners = this.practitioners.filter(practitioner => {
        return practitioner.specialities?.some(spec => spec.speciality?.id === this.consultation.selectedSpecialtyId);
      });
    } else {
      this.filteredPractitioners = [];
    }
    this.consultation.selectedPractitionerId = undefined;
  }

  // Helper methods
  async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }
  async showDetailsfillError(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }
   
}
