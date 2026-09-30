import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';
import Customer from './Customer.model.js';
import Supplier from './Supplier.model.js';

export const Payment = sequelize.define(
  'Payment',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    partyType: {
      type: DataTypes.ENUM('Customer', 'Supplier'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['Customer', 'Supplier']],
          msg: 'Party type must be either Customer or Supplier',
        },
      },
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Customer,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Supplier,
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'Amount is required' },
        isDecimal: { msg: 'Amount must be a valid number' },
        min: {
          args: [0.01],
          msg: 'Amount must be greater than 0',
        },
      },
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    paymentMode: {
      type: DataTypes.ENUM('Cash', 'Online'),
      allowNull: false,
      defaultValue: 'Cash',
      validate: {
        isIn: {
          args: [['Cash', 'Online']],
          msg: 'Payment mode must be either Cash or Online',
        },
      },
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'note',
          typeof value === 'string' && value.trim() ? value.trim() : null
        );
      },
    },
  },
  {
    tableName: 'payments',
    timestamps: true,
  }
);

// Associations
Payment.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Payment, { foreignKey: 'customerId', as: 'payments' });

Payment.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
Supplier.hasMany(Payment, { foreignKey: 'supplierId', as: 'payments' });

export default Payment;
