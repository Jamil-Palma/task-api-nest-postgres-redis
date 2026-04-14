import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully logged in. Returns JWT.',
    schema: {
      example: { data: { access_token: 'eyJhbGciOiJIUzI1...' } }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid email or password format.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. Invalid credentials.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuario creado y logueado exitosamente. Retorna JWT.',
    schema: { example: { data: { access_token: 'eyJhbGciOi...' } } }
  })
  @ApiResponse({ status: 400, description: 'Bad Request. Formato inválido.' })
  @ApiResponse({ status: 409, description: 'Conflict. El email ya existe.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}