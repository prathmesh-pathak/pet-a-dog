create database petadog;

use petadog;

create table dog (
	dog_main_id int primary key,
	dog_id int,
    dog_name varchar(50),
    dog_breed varchar(50),
    dog_years int,
    dog_months int,
    dog_gender varchar(50),
    dog_isMicrochipped varchar(10),
    dog_isWellWithCtas varchar(10),
    dog_goWellWithDogs varchar(10),
    dog_goWellWithChildrens varchar(10),
    dog_isHousetrained varchar(10)
);

create table housing_condition(
	house_main_id int primary key,
    house_id int,
    address_line_1 varchar(300),
    city varchar(300),
    state varchar(300),
    address_line_2 varchar(300),
    house_zipcode int,
    house_condition varchar(10),
    house_heating varchar(10),
    house_fence varchar(10)
);

