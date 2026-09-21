import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.config.js';

export const Vehicle = sequelize.define(
  'Vehicle',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    vehicleNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Vehicle number is required' },
      },
      set(value) {
        this.setDataValue(
          'vehicleNumber',
          typeof value === 'string' ? value.trim().toUpperCase() : value
        );
      },
    },
    chassisNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'chassisNumber',
          typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null
        );
      },
    },
    engineNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      set(value) {
        this.setDataValue(
          'engineNumber',
          typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null
        );
      },
    },
  },
  {
    tableName: 'vehicles',
    timestamps: true,
  }
);

export default Vehicle;
