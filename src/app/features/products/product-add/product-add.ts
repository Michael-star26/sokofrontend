import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductService } from '../../../core/services/product';

// NG-ZORRO Modules
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-product-add',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzButtonModule
  ],
  templateUrl: './product-add.html',
  styleUrl: './product-add.css'
})
export class ProductAdd {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private router = inject(Router);
  private message = inject(NzMessageService);

  isSubmitting = signal(false);

  productForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    category: ['', [Validators.required]],
    cost: [null, [Validators.required, Validators.min(0)]],
    image_url: [''],
    description: ['']
  });

  imageUrl = toSignal(
    this.productForm.get('image_url')!.valueChanges,
    { initialValue: '' }
  );

  submitForm(): void {
    if (this.productForm.invalid) {
      Object.values(this.productForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    this.isSubmitting.set(true);

    this.productService.addProduct(this.productForm.value).subscribe({
      next: () => {
        this.message.success('Product created successfully!');
        this.isSubmitting.set(false);
        this.router.navigate(['/products']);
      },
      error: () => {
        this.message.error('Failed to create product.');
        this.isSubmitting.set(false);
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/products']);
  }
}
