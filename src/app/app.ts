import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MoonCalculator } from './moon-calculator/moon-calculator';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MoonCalculator],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'moon-app';
}
