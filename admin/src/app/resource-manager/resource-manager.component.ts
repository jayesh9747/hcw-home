import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { SpecialityService } from '../services/speciality.service';
import { LanguageService } from '../services/language.service';
import { OrganizationService } from '../services/organization.service';
import { GroupService } from '../services/group.service';
import { SnackbarService } from '../services/snackbar.service';
import { AngularSvgIconModule } from 'angular-svg-icon';

@Component({
  selector: 'app-resource-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    AngularSvgIconModule,
  ],
  templateUrl: './resource-manager.component.html',
  styleUrls: ['./resource-manager.component.scss']
})
export class ResourceManagerComponent {
  selectedTabIndex = 0;
  resourceForm: FormGroup;
  resources: any[] = [];
  organizations: any[] = [];
  selectedOrganizationId: number | null = null;
  isEditMode = false;
  editResourceId: number | null = null;

  displayedColumns: string[] = ['name', 'actions'];

  tabs = [
    { label: 'Organizations', type: 'organization' },
    { label: 'Groups', type: 'group' },
    { label: 'Languages', type: 'language' },
    { label: 'Specialities', type: 'speciality' },
  ];

  constructor(
    private specialityService: SpecialityService,
    private languageService: LanguageService,
    private organizationService: OrganizationService,
    private groupService: GroupService,
    private snackBarService: SnackbarService,
    private fb: FormBuilder
  ) {
    this.resourceForm = this.fb.group({
      name: ['', Validators.required]
    });
    this.loadResources();
    this.loadOrganizations();
  }

  onTabChange(index: number) {
    this.selectedTabIndex = index;
    this.resetForm();
    this.loadResources();
  }

  loadOrganizations() {
    this.organizationService.getAllOrganizations().subscribe({
      next: (data) => this.organizations = data,
      error: () => this.snackBarService.showError('Failed to load organizations')
    });
  }

  loadResources() {
    const type = this.tabs[this.selectedTabIndex].type;

    if (type === 'organization') {
      this.organizationService.getAllOrganizations().subscribe({
        next: (data) => this.resources = data,
        error: () => this.snackBarService.showError('Failed to load organizations')
      });
    } else if (type === 'group' && this.selectedOrganizationId) {
      this.groupService.getGroupsByOrganization(this.selectedOrganizationId).subscribe({
        next: (data) => this.resources = data,
        error: () => this.snackBarService.showError('Failed to load groups')
      });
    } else if (type === 'language') {
      this.languageService.getAllLanguages().subscribe({
        next: (data) => this.resources = data,
        error: () => this.snackBarService.showError('Failed to load languages')
      });
    } else if (type === 'speciality') {
      this.specialityService.getAllSpecialities().subscribe({
        next: (data) => this.resources = data,
        error: () => this.snackBarService.showError('Failed to load specialities')
      });
    }
  }

  onOrganizationChange() {
    this.loadResources();
  }

  onSubmit() {
    if (this.resourceForm.invalid) return;

    const type = this.tabs[this.selectedTabIndex].type;
    const payload = { name: this.resourceForm.value.name };

    if (this.isEditMode && this.editResourceId !== null) {
      this.updateResource(type, this.editResourceId, payload);
    } else {
      this.createResource(type, payload);
    }
  }

  createResource(type: string, payload: any) {
    if (type === 'organization') {
      this.organizationService.createOrganization(payload).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Organization created successfully');
          this.postSave();
        },
        error: () => this.snackBarService.showError('Failed to create organization')
      });
    } else if (type === 'group' && this.selectedOrganizationId) {
      this.groupService.createGroup(this.selectedOrganizationId, payload).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Group created successfully');
          this.postSave();
        },
        error: () => this.snackBarService.showError('Failed to create group')
      });
    } else if (type === 'language') {
      this.languageService.createLanguage(payload).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Language created successfully');
          this.postSave();
        },
        error: () => this.snackBarService.showError('Failed to create language')
      });
    } else if (type === 'speciality') {
      this.specialityService.createSpeciality(payload).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Speciality created successfully');
          this.postSave();
        },
        error: () => this.snackBarService.showError('Failed to create speciality')
      });
    }
  }

  updateResource(type: string, id: number, payload: any) {
    if (type === 'organization') {
      this.organizationService.updateOrganization(id, payload).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Organization updated successfully');
          this.postSave();
        },
        error: () => this.snackBarService.showError('Failed to update organization')
      });
    } else if (type === 'group' && this.selectedOrganizationId) {
      this.groupService.updateGroup(this.selectedOrganizationId, id, payload).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Group updated successfully');
          this.postSave();
        },
        error: () => this.snackBarService.showError('Failed to update group')
      });
    } else if (type === 'language') {
      this.languageService.updateLanguage(id, payload).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Language updated successfully');
          this.postSave();
        },
        error: () => this.snackBarService.showError('Failed to update language')
      });
    } else if (type === 'speciality') {
      this.specialityService.updateSpeciality(id, payload).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Speciality updated successfully');
          this.postSave();
        },
        error: () => this.snackBarService.showError('Failed to update speciality')
      });
    }
  }

  deleteResource(id: number) {
    const type = this.tabs[this.selectedTabIndex].type;

    if (type === 'organization') {
      this.organizationService.deleteOrganization(id).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Organization deleted successfully');
          this.loadResources();
        },
        error: () => this.snackBarService.showError('Failed to delete organization')
      });
    } else if (type === 'group' && this.selectedOrganizationId) {
      this.groupService.deleteGroup(this.selectedOrganizationId, id).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Group deleted successfully');
          this.loadResources();
        },
        error: () => this.snackBarService.showError('Failed to delete group')
      });
    } else if (type === 'language') {
      this.languageService.deleteLanguage(id).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Language deleted successfully');
          this.loadResources();
        },
        error: () => this.snackBarService.showError('Failed to delete language')
      });
    } else if (type === 'speciality') {
      this.specialityService.deleteSpeciality(id).subscribe({
        next: () => {
          this.snackBarService.showSuccess('Speciality deleted successfully');
          this.loadResources();
        },
        error: () => this.snackBarService.showError('Failed to delete speciality')
      });
    }
  }

  editResource(resource: any) {
    this.isEditMode = true;
    this.editResourceId = resource.id;
    this.resourceForm.patchValue({ name: resource.name });
  }

  resetForm() {
    this.resourceForm.reset();
    this.isEditMode = false;
    this.editResourceId = null;
  }

  postSave() {
    this.resetForm();
    this.loadResources();
  }
}
