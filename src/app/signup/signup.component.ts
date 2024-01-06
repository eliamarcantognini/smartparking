import {Component, Inject, OnInit} from '@angular/core'
import {User, UserBuilder} from "../models/user"
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms"
import {MAT_DIALOG_DATA, MatDialog} from "@angular/material/dialog"
import {WebsiteRole} from "../models/role"
import {AuthenticationService} from "../services/backendcalls/authenticationservice"
import {Router} from "@angular/router"
import {UserInformationService} from "../services/userinformationservice"
import {SigninErrorDialogComponent} from "../signin/sign-in.component"
import {CustomerService} from "../services/backendcalls/customerservice"
import {LocalStorageService} from "../services/localstorageservice";

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./../app.component.scss', './signup.component.scss']
})

export class SignupComponent implements OnInit {

  constructor(
    private dialog: MatDialog,
    private fb: FormBuilder,
    private router: Router,
    private authenticationService: AuthenticationService,
    private userInfoService: UserInformationService,
    private customerService: CustomerService,
    private lStorageService: LocalStorageService
  ) {
    this.signupForm = this.fb.group({
      name: this.nameFormControl,
      surname: this.surnameFormControl,
      email: this.emailFormControl,
      cf: this.CFFormControl,
      password: this.passwordFormControl,
      zipCode: this.zipCodeFormControl,
      address: this.addressFormControl,
      city: this.cityFormControl,
      birthday: this.birthdayFormControl,
      role: this.roleFormControl
    })

    for (const role in WebsiteRole) {
      this.roles.push(role)
    }
  }

  private signupForm!: FormGroup

  roles: string[] = []

  hide = true

  nameFormControl = new FormControl('', [Validators.required])
  surnameFormControl = new FormControl('', [Validators.required])
  emailFormControl = new FormControl('', [Validators.required])
  CFFormControl = new FormControl('', [Validators.required])
  passwordFormControl = new FormControl('', [Validators.required])
  zipCodeFormControl = new FormControl('', [Validators.required])
  addressFormControl = new FormControl('', [Validators.required])
  cityFormControl = new FormControl('', [Validators.required])
  birthdayFormControl = new FormControl('', [Validators.required])
  roleFormControl = new FormControl('', [Validators.required])

  ngOnInit(): void {
  }

  initUser(): User {
    return new UserBuilder()
      .setName(this.nameFormControl.value)
      .setSurname(this.surnameFormControl.value)
      .setBirthday(
        this.birthdayFormControl.value.getFullYear() + '-'
        + (this.birthdayFormControl.value.getMonth()+1) + '-'
        + this.birthdayFormControl.value.getDate()
      )
      .setCF(this.CFFormControl.value)
      .setEmail(this.emailFormControl.value)
      .setAddress(this.addressFormControl.value)
      .setZipCode(this.zipCodeFormControl.value)
      .setCity(this.cityFormControl.value)
      .setRole(this.roleFormControl.value)
      .setPassword(this.passwordFormControl.value)
      .build()
  }

  submit() {
    if (this.signupForm.valid) {
      this.authenticationService.signup(this.initUser(), this.roleFormControl.value)
        .subscribe({
          next: (res) => {
            this.doLogin()
          },
          error: (err) => {
            this.dialog.open(SignupErrorDialogComponent, {
              data: {
                statusCode: err.status
              }
            })
          }
        })
    }
  }

  private doLogin() {
    this.authenticationService.signin(
      this.emailFormControl.value,
      this.passwordFormControl.value,
      this.roleFormControl.value
    ).subscribe({
      next: (signinResponse) => {
        this.lStorageService.setUserToken(signinResponse.token)
        this.customerService.getCustomerByID(signinResponse.id).subscribe({
          next: (userResponse) => {
            this.userInfoService.login(userResponse, signinResponse.token)
            this.router.navigate(['/customerhome'])
          },
          error: (err) => {
            this.dialog.open(SigninErrorDialogComponent)
          }
        })
      },
      error: (err) => {
        this.dialog.open(SignupErrorDialogComponent, {
          data: {
            statusCode: err.status
          }
        })
      }
    })
  }

}

@Component({
  selector: 'app-signup-error-dialog',
  templateUrl: './signup-error-dialog.html',
})
export class SignupErrorDialogComponent {

  emailAlreadyPresent = false

  constructor(@Inject(MAT_DIALOG_DATA) public errorStatus: any) {
    this.emailAlreadyPresent = true
  }
}
