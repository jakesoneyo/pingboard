import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

/**
 * 사용자. `email` UNIQUE(I1)가 로그인 조회와 중복 가입 방지를 겸한다.
 * 데모 계정(admin)도 이 테이블에 정상적으로 저장되며 bcrypt 해시 경로를 그대로 탄다.
 */
@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 30 })
  nickname: string;

  @Column({ type: 'varchar', length: 60, name: 'password_hash' })
  passwordHash: string;
}
