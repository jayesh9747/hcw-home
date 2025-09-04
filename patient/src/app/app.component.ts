import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { EnvironmentValidationService } from './services/environment-validation.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private environmentValidation: EnvironmentValidationService) { }

  async ngOnInit() {
    await this.environmentValidation.validateFullConfiguration();
  }
}
