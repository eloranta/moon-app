import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MoonCalculator } from './moon-calculator/moon-calculator';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, MoonCalculator],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true
})
export class App {
  protected title = 'moon-app';
  myLocator = ''
  dxLocator = ''
}
